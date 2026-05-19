import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComposePost } from '@/components/compose-post';
import { PostCard } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fetchFeed, type Post } from '@/lib/posts-api';

export default function FeedScreen() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setError('');
    try {
      const list = await fetchFeed(session.userId);
      setPosts(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the feed.');
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
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="subtitle">Feed</ThemedText>
              <ComposePost
                authorId={session.userId}
                authorName={session.name}
                onPosted={(p) => setPosts((prev) => [p, ...prev])}
              />
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              viewerId={session.userId}
              onChange={(next) =>
                setPosts((prev) => prev.map((p) => (p.id === next.id ? next : p)))
              }
            />
          )}
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
            loading ? (
              <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
                Loading…
              </ThemedText>
            ) : (
              <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
                {error || 'No posts yet — be the first to share something.'}
              </ThemedText>
            )
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  list: { padding: Spacing.three },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  sep: { height: Spacing.three },
  empty: { textAlign: 'center', marginTop: Spacing.five },
});
