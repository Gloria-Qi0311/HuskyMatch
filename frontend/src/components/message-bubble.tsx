import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Message } from '@/lib/messages-api';

type Props = { message: Message; mine: boolean };

/** A single message bubble (text or media). */
export function MessageBubble({ message, mine }: Props) {
  const theme = useTheme();
  const showMedia = message.messageType !== 'text' && !!message.mediaUrl;
  const textColor = mine ? '#FFFFFF' : theme.text;

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? Brand.violet500 : theme.backgroundElement,
            borderBottomRightRadius: mine ? 4 : 18,
            borderBottomLeftRadius: mine ? 18 : 4,
          },
        ]}>
        {showMedia && message.mediaUrl ? (
          <Image
            source={{ uri: message.mediaUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : null}
        {message.body ? (
          <ThemedText type="default" style={{ color: textColor }}>
            {message.body}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.three },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: Spacing.one,
  },
  image: { width: 220, height: 220, borderRadius: 12 },
});
