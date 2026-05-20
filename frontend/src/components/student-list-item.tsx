import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Student } from '@/lib/profile-api';

type Props = { student: Student };

/** Compact row used in search results and recommendation lists. */
export function StudentListItem({ student }: Props) {
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
        styles.row,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <Avatar name={student.name} size={44} />
      <View style={styles.body}>
        <ThemedText type="smallBold">{student.name}</ThemedText>
        {meta ? (
          <ThemedText type="small" themeColor="textSecondary">
            {meta}
          </ThemedText>
        ) : null}
        {student.schoolName ? (
          <ThemedText type="small" themeColor="textSecondary">
            {student.schoolName}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
  },
  body: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});
