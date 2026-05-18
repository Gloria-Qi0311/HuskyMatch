import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
};

/** Temporary placeholder screen used while real screens are being built. */
export function ScreenPlaceholder({ title, subtitle }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.centered}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.centered}>
            {subtitle}
          </ThemedText>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  centered: { textAlign: 'center' },
});
