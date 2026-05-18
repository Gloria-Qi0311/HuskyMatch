import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

/** Multi-select chip picker for interests, skills, etc. */
export function TagPicker({ options, selected, onToggle }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onToggle(option)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: active ? Brand.violet500 : theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: active ? '#FFFFFF' : theme.text }}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  pressed: { opacity: 0.7 },
});
