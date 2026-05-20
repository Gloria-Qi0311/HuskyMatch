import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscoverCard } from '@/components/discover-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fetchRecommendations, type Recommendation } from '@/lib/recommendations-api';

export default function DiscoverScreen() {
  const { session } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    fetchRecommendations(session.userId, 10)
      .then(setRecs)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Could not load Daily Picks.'),
      )
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return null;

  const total = recs.length;
  const current = recs[index];
  const done = !loading && total > 0 && index >= total;
  const advance = () => setIndex((i) => i + 1);
  const viewCurrentProfile = () => {
    if (current) {
      router.push({
        pathname: '/students/[id]',
        params: { id: String(current.userId) },
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Discover</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Today&apos;s Huskies
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => router.push('/search')}
            style={styles.searchBtn}>
            <Ionicons name="search" size={22} color={Brand.violet700} />
          </Pressable>
        </View>

        {total > 0 ? (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(Math.min(index, total) / total) * 100}%` },
                ]}
              />
            </View>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {`${Math.min(index + 1, total)} / ${total}`}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.deck}>
          {loading ? (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Loading…
            </ThemedText>
          ) : total === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {error ||
                'No recommendations yet. Add interests and skills to your profile to see matches.'}
            </ThemedText>
          ) : done ? (
            <View style={styles.empty}>
              <ThemedText type="subtitle" style={styles.center}>
                All done for today!
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
                Come back tomorrow for a fresh deck.
              </ThemedText>
            </View>
          ) : current ? (
            <Pressable onPress={viewCurrentProfile}>
              <DiscoverCard rec={current} />
            </Pressable>
          ) : null}
        </View>

        {!loading && current ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pass"
              onPress={advance}
              style={({ pressed }) => [styles.passBtn, pressed && styles.pressed]}>
              <Ionicons name="close" size={30} color={Brand.violet700} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Interested"
              onPress={advance}
              style={({ pressed }) => [styles.likeBtn, pressed && styles.pressed]}>
              <Ionicons name="arrow-forward" size={30} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { gap: 4 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.violet100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: Brand.violet100,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: Brand.violet500 },
  deck: { flex: 1, justifyContent: 'center' },
  center: { textAlign: 'center', paddingHorizontal: Spacing.four },
  empty: { alignItems: 'center', gap: Spacing.two },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingBottom: Spacing.two,
  },
  passBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.violet100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
