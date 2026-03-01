import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/card';
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { CurvedHeader } from '@/components/ui/curved-header';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/Colors';
import { Typography, Fonts } from '@/constants/typography';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
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
          <Ionicons name="send" size={18} color={Colors.textOnPrimary} />
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
          borderRadius: BorderRadius.heroCard,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
        }}
      >
        <Text style={[Typography.secondary, { color: Colors.primary, fontFamily: Fonts.semiBold }]}>{text}</Text>
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
  const insets = useSafeAreaInsets();
  const keyboardPadding = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // Subtract insets.bottom because the input container already includes it
      const height = e.endCoordinates.height - insets.bottom;
      keyboardPadding.value = withTiming(height, { duration: 250 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardPadding.value = withTiming(0, { duration: 200 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardPadding.value,
  }));

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
    Keyboard.dismiss();
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
      const MAX_CHAT_HISTORY = 20;
      const allHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const chatHistory = allHistory.slice(-MAX_CHAT_HISTORY);

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
      <View style={{ marginBottom: Spacing.md, maxWidth: '85%', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs }}>
            <Ionicons name="sparkles" size={12} color={Colors.primary} />
            <Text style={[Typography.tabLabel, { color: Colors.textMuted }]}>AI Assistant</Text>
          </View>
        )}
        {isUser ? (
          <View
            style={{ backgroundColor: Colors.primary, borderRadius: BorderRadius.messageBubble, borderBottomRightRadius: BorderRadius.messageTail, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
          >
            <Text style={[Typography.body, { color: Colors.textOnPrimary }]}>{item.content}</Text>
          </View>
        ) : (
          <View
            style={[
              Shadows.sm,
              {
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.messageBubble,
                borderBottomLeftRadius: BorderRadius.messageTail,
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.md,
              },
            ]}
          >
            <Text style={[Typography.body, { color: Colors.textHeading }]}>{item.content}</Text>
          </View>
        )}
        {!isUser && (
          <Text style={[Typography.tabLabel, { color: Colors.textMuted, marginTop: Spacing.xs, marginLeft: Spacing.sm }]}>
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
          borderTopLeftRadius: BorderRadius.curvedHeader,
          borderTopRightRadius: BorderRadius.curvedHeader,
        }}
      >
        <Animated.View style={[{ flex: 1 }, keyboardStyle]}>
          {/* Messages */}
          <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing['2xl'] }}>
            {isLoading ? (
              <View className="gap-3">
                <Skeleton height={60} className="w-2/3 self-start rounded-2xl" />
                <Skeleton height={40} className="w-1/2 self-end rounded-2xl" />
                <Skeleton height={80} className="w-3/4 self-start rounded-2xl" />
              </View>
            ) : messages.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden', marginBottom: Spacing.sm }}>
                  <Image
                    source={require('@/assets/illustrations/mascot-reading.png')}
                    style={{ width: 140, height: 140 }}
                    contentFit="cover"
                  />
                </View>
                <Text style={[Typography.body, { color: Colors.textBody, marginTop: Spacing.md, textAlign: 'center' }]}>
                  Ask any question about this record
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg, paddingHorizontal: Spacing.lg }}>
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
                estimatedItemSize={80}
                contentContainerStyle={{ paddingBottom: Spacing.sm }}
                onContentSizeChange={() =>
                  listRef.current?.scrollToEnd({ animated: true })
                }
              />
            )}
          </View>

          {/* Input */}
          <View style={[Shadows.sm, { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md + insets.bottom }]}>
            <DisclaimerBanner className="mb-2" />
            <View className="flex-row items-end gap-2">
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: Colors.primaryLight,
                  borderRadius: BorderRadius.heroCard,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  ...Typography.body,
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
        </Animated.View>
      </View>
    </View>
  );
}
