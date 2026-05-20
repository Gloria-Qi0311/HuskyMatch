import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { askAssistant } from '@/lib/assistant-api';
import { useAuth } from '@/lib/auth-context';

/** Decide whether the FAB should be visible on the current route. */
function shouldShow(segments: string[]): boolean {
  if (segments[0] === '(auth)') return false; // pre-auth flow
  if (segments[0] === 'messages') return false; // DM thread
  if (segments[0] === '(tabs)' && segments[1] === 'assistant') return false; // already on AI
  return true;
}

/** Floating "Ask AI" pill — quick-prompt sheet that answers or drafts text. */
export function AIFab() {
  const segments = useSegments() as string[];
  const { session } = useAuth();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!session) return null;
  if (!shouldShow(segments)) return null;

  const submit = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setError('');
    setReply('');
    try {
      const r = await askAssistant(session.userId, text);
      setReply(r.reply || '(no reply)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the assistant.');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setInput('');
      setReply('');
      setError('');
    }, 200);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask AI"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        <ThemedText type="smallBold" style={styles.fabText}>
          Ask AI
        </ThemedText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.sheet}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.headerRow}>
                  <ThemedText type="subtitle">Ask AI</ThemedText>
                  <Pressable onPress={close} hitSlop={8}>
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  A quick question or draft — stays on this screen.
                </ThemedText>

                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="e.g. Draft an opener to a CSE student into climbing"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  autoFocus
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                />

                {reply ? (
                  <ScrollView style={styles.replyBox}>
                    <ThemedText type="default">{reply}</ThemedText>
                  </ScrollView>
                ) : null}
                {error ? (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    onPress={submit}
                    disabled={!input.trim() || loading}
                    style={[
                      styles.submit,
                      {
                        backgroundColor:
                          input.trim() && !loading ? Brand.violet500 : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color:
                          input.trim() && !loading ? '#FFFFFF' : theme.textSecondary,
                      }}>
                      {loading ? 'Thinking…' : 'Ask'}
                    </ThemedText>
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Brand.violet500,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: { opacity: 0.9 },
  fabText: { color: '#FFFFFF' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    minHeight: 80,
    maxHeight: 160,
    borderRadius: 14,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  replyBox: { maxHeight: 200 },
  actions: { alignItems: 'flex-end' },
  submit: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  error: { color: '#E5484D' },
});
