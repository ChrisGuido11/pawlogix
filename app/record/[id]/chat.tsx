import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Card } from '@/components/ui/card';
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import type { RecordChat, HealthRecord } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SendButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const prevEnabled = useRef(false);

  useEffect(() => {
    if (enabled && !prevEnabled.current) {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
    prevEnabled.current = enabled;
  }, [enabled]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (enabled) {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!enabled}
      style={[animStyle, enabled ? Shadows.warmGlow : {}]}
    >
      {enabled ? (
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </View>
      ) : (
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="send" size={18} color={Colors.textTertiary} />
        </View>
      )}
    </AnimatedPressable>
  );
}

function SuggestionPill({ text, onPress, index }: { text: string; onPress: () => void; index: number }) {
  const animStyle = useStaggeredEntrance(index);
  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: Colors.primary50,
          borderWidth: 1,
          borderColor: Colors.primary200,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text className="text-sm text-primary font-semibold">{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function RecordChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const listRef = useRef<FlashListRef<ChatMessage>>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const { data: recordData } = await supabase
          .from('pl_health_records')
          .select('*')
          .eq('id', id)
          .single();
        if (recordData) setRecord(recordData as HealthRecord);

        const { data: chatData } = await supabase
          .from('pl_record_chats')
          .select('*')
          .eq('health_record_id', id)
          .order('created_at', { ascending: true });
        if (chatData) setMessages(chatData as ChatMessage[]);
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const sendMessage = async () => {
    if (!input.trim() || !id || !user || isSending) return;
    const messageText = input.trim();
    setInput('');
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const { data: savedUserMsg } = await supabase
        .from('pl_record_chats')
        .insert({
          health_record_id: id,
          user_id: user.id,
          role: 'user',
          content: messageText,
        })
        .select()
        .single();

      const { data: { session } } = await supabase.auth.getSession();
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pl-health-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            health_record_id: id,
            message: messageText,
            chat_history: chatHistory,
          }),
        }
      );

      const data = await response.json();

      if (data.reply) {
        const { data: savedAssistantMsg } = await supabase
          .from('pl_record_chats')
          .insert({
            health_record_id: id,
            user_id: user.id,
            role: 'assistant',
            content: data.reply,
          })
          .select()
          .single();

        const assistantMessage: ChatMessage = {
          id: savedAssistantMsg?.id ?? `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View className={`mb-3 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
        {!isUser && (
          <View className="flex-row items-center gap-1 mb-1">
            <Ionicons name="sparkles" size={12} color={Colors.primary300} />
            <Text style={{ fontSize: 10, color: Colors.textTertiary }}>AI Assistant</Text>
          </View>
        )}
        {isUser ? (
          <View
            style={{ backgroundColor: '#F5A623', borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text className="text-base text-white leading-6">{item.content}</Text>
          </View>
        ) : (
          <View
            style={[
              Shadows.sm,
              {
                backgroundColor: Colors.surfaceMuted,
                borderRadius: 18,
                borderBottomLeftRadius: 6,
                paddingHorizontal: 16,
                paddingVertical: 12,
              },
            ]}
          >
            <Text className="text-base text-text-primary leading-6">{item.content}</Text>
          </View>
        )}
        {!isUser && (
          <Text style={{ fontSize: 10, color: Colors.textTertiary, marginTop: 4, marginLeft: 8 }}>
            AI interpretation — consult your vet
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View
        style={[Shadows.sm, { backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[Shadows.sm, { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }]}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-text-primary">
            Ask About This Record
          </Text>
          {record?.interpretation?.summary && (
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              {record.interpretation.summary}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <View className="flex-1 px-4 pt-4">
          {isLoading ? (
            <View className="gap-3">
              <Skeleton height={60} className="w-2/3 self-start rounded-2xl" />
              <Skeleton height={40} className="w-1/2 self-end rounded-2xl" />
              <Skeleton height={80} className="w-3/4 self-start rounded-2xl" />
            </View>
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.primary200} />
              <Text className="text-base text-text-secondary mt-3 text-center">
                Ask any question about this record
              </Text>
              <View className="flex-row flex-wrap justify-center gap-2 mt-4 px-4">
                {[
                  'What do these results mean?',
                  'Is anything concerning?',
                  'What should I ask my vet?',
                ].map((suggestion, idx) => (
                  <SuggestionPill
                    key={suggestion}
                    text={suggestion}
                    onPress={() => setInput(suggestion)}
                    index={idx}
                  />
                ))}
              </View>
            </View>
          ) : (
            <FlashList
              ref={listRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}
        </View>

        {/* Input */}
        <View style={[Shadows.sm, { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 12 }]}>
          <DisclaimerBanner className="mb-2" />
          <View className="flex-row items-end gap-2">
            <TextInput
              style={[
                {
                  flex: 1,
                  backgroundColor: Colors.surfaceMuted,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: Colors.textPrimary,
                  maxHeight: 96,
                },
              ]}
              placeholder="Ask a question..."
              placeholderTextColor={Colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!isSending}
            />
            <SendButton
              enabled={!!input.trim() && !isSending}
              onPress={sendMessage}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
