import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/verified-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Student } from '@/lib/profile-api';

type Props = {
  student: Student;
  actions?: ReactNode;
};

/** Shared read-only profile layout used for own + other-user profiles. */
export function StudentProfileView({ student, actions }: Props) {
  const interests = (student.interests ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const skills = student.skills ?? [];
  const location = [student.city, student.country].filter(Boolean).join(', ');
  const meta = [student.year, student.major].filter(Boolean).join(' · ');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Avatar name={student.name} size={96} />
            <ThemedText type="subtitle" style={styles.center}>
              {student.name}
            </ThemedText>
            <VerifiedBadge />
            {meta ? (
              <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
                {meta}
              </ThemedText>
            ) : null}
            {student.schoolName ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {student.schoolName}
              </ThemedText>
            ) : null}
            {location ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {location}
              </ThemedText>
            ) : null}
          </View>

          {interests.length ? (
            <Section title="Interests">
              <ChipRow values={interests} />
            </Section>
          ) : null}

          {skills.length ? (
            <Section title="Skills">
              <ChipRow values={skills} />
            </Section>
          ) : null}

          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function ChipRow({ values }: { values: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.chipRow}>
      {values.map((v) => (
        <View
          key={v}
          style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{v}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
});
