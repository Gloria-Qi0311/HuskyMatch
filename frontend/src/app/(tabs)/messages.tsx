import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { listThreads, type ThreadSummary } from '@/lib/messages-api';

export default function MessagesScreen() {
  const { session } = useAuth();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setError('');
    try {
      setThreads(await listThreads(session.userId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) return null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Messages</ThemedText>
        </View>
        <FlatList
          data={threads}
          keyExtractor={(t) => String(t.otherUserId)}
          renderItem={({ item }) => <ThreadRow thread={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          ListEmptyComponent={
            <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
              {loading
                ? 'Loading…'
                : error || 'No conversations yet. Start one from a profile.'}
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function ThreadRow({ thread }: { thread: ThreadSummary }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/messages/[otherId]',
          params: { otherId: String(thread.otherUserId) },
        })
      }
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <Avatar name={thread.otherName} size={44} />
      <View style={styles.body}>
        <ThemedText type="smallBold">{thread.otherName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {thread.lastMessageBody}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { padding: Spacing.three },
  list: { padding: Spacing.three },
  sep: { height: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
  },
  body: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  pressed: { opacity: 0.85 },
});
