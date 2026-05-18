import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

const ERROR_COLOR = '#E5484D';

export function TextField({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? ERROR_COLOR : focused ? theme.tint : 'transparent';

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor },
          style,
        ]}
      />
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  error: { color: ERROR_COLOR },
});
