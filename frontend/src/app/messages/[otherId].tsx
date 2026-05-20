import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MeetupComposerModal } from '@/components/meetup-composer-modal';
import { MessageBubble } from '@/components/message-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fetchThread, sendMessage, type Message } from '@/lib/messages-api';
import { fetchStudent } from '@/lib/profile-api';

export default function DirectMessageScreen() {
  const { otherId } = useLocalSearchParams<{ otherId: string }>();
  const { session } = useAuth();
  const theme = useTheme();
  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState<string>('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [meetupVisible, setMeetupVisible] = useState(false);

  const otherUserId = Number(otherId);

  const load = useCallback(async () => {
    if (!session || !otherUserId) return;
    try {
      const msgs = await fetchThread(session.userId, otherUserId);
      setMessages(msgs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load messages.');
    }
  }, [session, otherUserId]);

  useEffect(() => {
    if (!otherUserId) return;
    fetchStudent(otherUserId)
      .then((s) => setOtherName(s.name))
      .catch(() => {});
    void load();
  }, [otherUserId, load]);

  if (!session) return null;

  const handleSend = async (text: string): Promise<boolean> => {
    setError('');
    setSending(true);
    try {
      const m = await sendMessage(session.userId, otherUserId, text);
      setMessages((prev) => [...prev, m]);
      setBody('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send.');
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    const text = body.trim();
    if (!text) return;
    void handleSend(text);
  };

  const handleMeetup = async (text: string) => {
    setMeetupVisible(false);
    const ok = await handleSend(text);
    if (ok) {
      Alert.alert(
        'Stay safe',
        'Meet in a public spot, tell a friend your plans, and trust your gut.',
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.title}>
            {otherName || 'Conversation'}
          </ThemedText>
          <View style={styles.spacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={({ item }) => (
              <MessageBubble message={item} mine={item.senderId === session.userId} />
            )}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
                {error || 'Say hi!'}
              </ThemedText>
            }
          />

          <View style={[styles.composer, { borderTopColor: theme.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Suggest a meetup"
              onPress={() => setMeetupVisible(true)}
              style={[styles.iconBtn, { backgroundColor: Brand.violet100 }]}>
              <Ionicons name="calendar-outline" size={20} color={Brand.violet700} />
            </Pressable>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Message…"
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
              disabled={!body.trim() || sending}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: body.trim() ? Brand.violet500 : theme.backgroundElement,
                },
              ]}>
              <Ionicons
                name="arrow-up"
                size={20}
                color={body.trim() ? '#FFFFFF' : theme.textSecondary}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <MeetupComposerModal
          visible={meetupVisible}
          onClose={() => setMeetupVisible(false)}
          onConfirm={handleMeetup}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  back: { padding: 4 },
  title: { flex: 1, textAlign: 'center' },
  spacer: { width: 32 },
  list: { paddingVertical: Spacing.three },
  gap: { height: 4 },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});
