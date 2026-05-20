import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/verified-badge';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Recommendation } from '@/lib/recommendations-api';

type Props = { rec: Recommendation };

/** A single "Daily Pick" card in the Discover deck. */
export function DiscoverCard({ rec }: Props) {
  const theme = useTheme();
  const interests = (rec.interests ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const meta = [rec.year, rec.major].filter(Boolean).join(' · ');

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.head}>
        <Avatar name={rec.name} size={56} />
        <View style={styles.headBody}>
          <ThemedText type="subtitle">{rec.name}</ThemedText>
          <VerifiedBadge />
          {meta ? (
            <ThemedText type="default" themeColor="textSecondary">
              {meta}
            </ThemedText>
          ) : null}
          {rec.schoolName ? (
            <ThemedText type="small" themeColor="textSecondary">
              {rec.schoolName}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.scoreBadge}>
          <ThemedText type="smallBold" style={styles.scoreText}>
            {`${Math.round(rec.matchScore)}%`}
          </ThemedText>
          <ThemedText type="small" style={styles.scoreLabel}>
            match
          </ThemedText>
        </View>
      </View>

      {rec.reason ? (
        <View style={[styles.reasonBox, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.reasonLabel}>
            WHY YOU MATCH
          </ThemedText>
          <ThemedText type="default">{rec.reason}</ThemedText>
        </View>
      ) : null}

      {interests.length > 0 ? (
        <TagSection title="Interests" values={interests.slice(0, 6)} />
      ) : null}
      {rec.skills.length > 0 ? (
        <TagSection title="Skills" values={rec.skills.slice(0, 6)} />
      ) : null}
    </ThemedView>
  );
}

function TagSection({ title, values }: { title: string; values: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.tagSection}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.tagLabel}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={styles.tagRow}>
        {values.map((v) => (
          <View
            key={v}
            style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">{v}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  head: { flexDirection: 'row', gap: Spacing.three },
  headBody: { flex: 1, gap: 4 },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.violet500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: '#FFFFFF', fontSize: 16 },
  scoreLabel: { color: '#FFFFFF', fontSize: 10, marginTop: -2 },
  reasonBox: { padding: Spacing.three, borderRadius: 16, gap: 4 },
  reasonLabel: { letterSpacing: 0.5 },
  tagSection: { gap: Spacing.two },
  tagLabel: { letterSpacing: 0.5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
});
