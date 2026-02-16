import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { DisclaimerBanner } from '@/components/ui/disclaimer-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { RecordChat, HealthRecord } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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
        // Fetch record
        const { data: recordData } = await supabase
          .from('pl_health_records')
          .select('*')
          .eq('id', id)
          .single();
        if (recordData) setRecord(recordData as HealthRecord);

        // Fetch chat history
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

    // Optimistic add user message
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Save user message
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

      // Call Edge Function
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
        // Save assistant message
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

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      className={`mb-3 max-w-[85%] ${
        item.role === 'user' ? 'self-end' : 'self-start'
      }`}
    >
      <View
        className={`rounded-2xl px-4 py-3 ${
          item.role === 'user' ? 'bg-primary' : 'bg-surface border border-border'
        }`}
      >
        <Text
          className={`text-base leading-6 ${
            item.role === 'user' ? 'text-white' : 'text-text-primary'
          }`}
        >
          {item.content}
        </Text>
      </View>
      {item.role === 'assistant' && (
        <Text className="text-[10px] text-text-secondary mt-1 ml-2">
          AI interpretation — consult your vet
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text-primary">
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
              <Skeleton height={60} className="w-2/3 self-start" />
              <Skeleton height={40} className="w-1/2 self-end" />
              <Skeleton height={80} className="w-3/4 self-start" />
            </View>
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text className="text-base text-text-secondary mt-3 text-center">
                Ask any question about this record
              </Text>
              <Text className="text-sm text-text-secondary mt-1 text-center">
                e.g., "What does elevated BUN mean?"
              </Text>
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
        <View className="px-4 py-3 bg-surface border-t border-border">
          <DisclaimerBanner className="mb-2" />
          <View className="flex-row items-end gap-2">
            <TextInput
              className="flex-1 bg-background rounded-2xl px-4 py-3 text-base text-text-primary max-h-24 border border-border"
              placeholder="Ask a question..."
              placeholderTextColor="#64748B"
              value={input}
              onChangeText={setInput}
              multiline
              editable={!isSending}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || isSending}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                input.trim() && !isSending ? 'bg-primary' : 'bg-disabled'
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() && !isSending ? '#FFFFFF' : '#64748B'}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
