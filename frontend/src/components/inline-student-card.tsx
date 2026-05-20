import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SuggestedStudent } from '@/lib/assistant-api';

type Props = { student: SuggestedStudent };

/** Compact student card rendered inside an assistant reply bubble. */
export function InlineStudentCard({ student }: Props) {
  const theme = useTheme();
  const meta = [student.year, student.major].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/students/[id]',
          params: { id: String(student.userId) },
        })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <Avatar name={student.name} size={36} />
      <View style={styles.body}>
        <ThemedText type="smallBold">{student.name}</ThemedText>
        {meta ? (
          <ThemedText type="small" themeColor="textSecondary">
            {meta}
          </ThemedText>
        ) : null}
        {student.reason ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {student.reason}
          </ThemedText>
        ) : null}
      </View>
      {student.matchScore != null ? (
        <View style={styles.score}>
          <ThemedText type="smallBold" style={styles.scoreText}>
            {`${Math.round(student.matchScore)}%`}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  body: { flex: 1, gap: 2 },
  score: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.violet500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});
