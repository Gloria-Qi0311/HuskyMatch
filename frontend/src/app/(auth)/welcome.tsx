import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Brand, Spacing } from '@/constants/theme';

const TRUST_POINTS = [
  'Every member is a verified UW student',
  'Private by default — you control who sees you',
  'Built for real, in-person connections',
];

export default function WelcomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.pill}>
            <ThemedText type="smallBold" style={styles.pillText}>
              UW STUDENTS ONLY
            </ThemedText>
          </View>
          <ThemedText type="title">Find your people on campus.</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Meet classmates, collaborators, and study partners — and turn online matches
            into real coffee at the HUB.
          </ThemedText>
          <View style={styles.trust}>
            {TRUST_POINTS.map((point) => (
              <ThemedText key={point} type="small" themeColor="textSecondary">
                {`•  ${point}`}
              </ThemedText>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Join HuskyMatch" onPress={() => router.push('/sign-up')} />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => router.push('/sign-in')}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            Not affiliated with or endorsed by the University of Washington.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  hero: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.violet100,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pillText: { color: Brand.violet700, letterSpacing: 0.5 },
  trust: { gap: Spacing.one, marginTop: Spacing.two },
  actions: { gap: Spacing.two },
  disclaimer: { textAlign: 'center', marginTop: Spacing.one },
});
