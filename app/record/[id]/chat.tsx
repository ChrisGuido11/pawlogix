import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
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
import { CurvedHeader } from '@/components/ui/curved-header';
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
      style={[animStyle, enabled ? Shadows.primaryButton : {}]}
    >
      {enabled ? (
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </View>
      ) : (
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="send" size={18} color={Colors.textMuted} />
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
          backgroundColor: Colors.primaryLight,
          borderWidth: 1,
          borderColor: Colors.primary,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 14, color: Colors.primary, fontWeight: '600' }}>{text}</Text>
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
      <View style={{ marginBottom: 12, maxWidth: '85%', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Ionicons name="sparkles" size={12} color={Colors.primary} />
            <Text style={{ fontSize: 10, color: Colors.textMuted }}>AI Assistant</Text>
          </View>
        )}
        {isUser ? (
          <View
            style={{ backgroundColor: Colors.primary, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 16, color: '#FFFFFF', lineHeight: 24 }}>{item.content}</Text>
          </View>
        ) : (
          <View
            style={[
              Shadows.sm,
              {
                backgroundColor: Colors.surface,
                borderRadius: 18,
                borderBottomLeftRadius: 6,
                paddingHorizontal: 16,
                paddingVertical: 12,
              },
            ]}
          >
            <Text style={{ fontSize: 16, color: Colors.textHeading, lineHeight: 24 }}>{item.content}</Text>
          </View>
        )}
        {!isUser && (
          <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 4, marginLeft: 8 }}>
            AI interpretation — consult your vet
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary }}>
      <CurvedHeader title="Ask About This Record" showBack />
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          marginTop: -32,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
            {isLoading ? (
              <View className="gap-3">
                <Skeleton height={60} className="w-2/3 self-start rounded-2xl" />
                <Skeleton height={40} className="w-1/2 self-end rounded-2xl" />
                <Skeleton height={80} className="w-3/4 self-start rounded-2xl" />
              </View>
            ) : messages.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.primary} />
                <Text style={{ fontSize: 16, color: Colors.textBody, marginTop: 12, textAlign: 'center' }}>
                  Ask any question about this record
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16, paddingHorizontal: 16 }}>
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
                style={{
                  flex: 1,
                  backgroundColor: Colors.primaryLight,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: Colors.textHeading,
                  maxHeight: 96,
                }}
                placeholder="Ask a question..."
                placeholderTextColor={Colors.textMuted}
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
      </View>
    </View>
  );
}
