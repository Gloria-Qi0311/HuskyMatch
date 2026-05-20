import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineStudentCard } from '@/components/inline-student-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { askAssistant, type SuggestedStudent } from '@/lib/assistant-api';
import { useAuth } from '@/lib/auth-context';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  students?: SuggestedStudent[];
  loading?: boolean;
};

const SUGGESTED_PROMPTS = [
  'Who in CSE is into climbing?',
  'Find me a study partner for STAT 311',
  'Anyone working on AI startups?',
];

export default function AssistantScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  if (!session) return null;

  const send = async (text: string) => {
    if (sending || !text.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };
    const placeholder: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: 'Thinking…',
      loading: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput('');
    setSending(true);
    try {
      const r = await askAssistant(session.userId, text.trim());
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                content: r.reply || '(no reply)',
                students: r.students,
                loading: false,
              }
            : m,
        ),
      );
    } catch (e) {
      const detail =
        e instanceof ApiError ? e.message : 'Could not reach the assistant.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, content: detail, loading: false }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    const text = input.trim();
    if (text) void send(text);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Assistant</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ask me who you should meet on campus.
          </ThemedText>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}>
          {messages.length === 0 ? (
            <View style={styles.intro}>
              <ThemedText type="default" themeColor="textSecondary">
                Try one of these:
              </ThemedText>
              <View style={styles.prompts}>
                {SUGGESTED_PROMPTS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => void send(p)}
                    style={({ pressed }) => [
                      styles.prompt,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small">{p}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <ChatBubble msg={item} />}
              ItemSeparatorComponent={() => <View style={styles.gap} />}
              contentContainerStyle={styles.list}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: false })
              }
            />
          )}

          <View style={[styles.composer, { borderTopColor: theme.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask the assistant…"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={handleSendText}
              disabled={!input.trim() || sending}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: input.trim() ? Brand.violet500 : theme.backgroundElement,
                },
              ]}>
              <Ionicons
                name="arrow-up"
                size={20}
                color={input.trim() ? '#FFFFFF' : theme.textSecondary}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const theme = useTheme();
  const mine = msg.role === 'user';
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: mine ? Brand.violet500 : theme.backgroundElement },
        ]}>
        <ThemedText
          type="default"
          style={{
            color: mine ? '#FFFFFF' : theme.text,
            opacity: msg.loading ? 0.7 : 1,
          }}>
          {msg.content}
        </ThemedText>
        {msg.students && msg.students.length > 0 ? (
          <View style={styles.cards}>
            {msg.students.map((s) => (
              <InlineStudentCard key={s.userId} student={s} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { padding: Spacing.three, gap: 4 },
  intro: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  prompts: { gap: Spacing.two },
  prompt: { padding: Spacing.three, borderRadius: 14 },
  pressed: { opacity: 0.85 },
  list: { padding: Spacing.three },
  gap: { height: Spacing.two },
  row: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    padding: Spacing.three,
    borderRadius: 18,
    gap: Spacing.two,
  },
  cards: { gap: Spacing.two },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
