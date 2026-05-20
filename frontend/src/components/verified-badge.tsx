import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';

/** "Verified Husky" trust pill shown on profiles and cards. */
export function VerifiedBadge() {
  return (
    <View style={styles.pill}>
      <Ionicons name="shield-checkmark" size={14} color={Brand.violet700} />
      <ThemedText type="smallBold" style={styles.text}>
        Verified Husky
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.violet100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { color: Brand.violet700 },
});
