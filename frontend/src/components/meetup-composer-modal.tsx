import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Brand, Spacing } from '@/constants/theme';

const LOCATIONS = [
  'The Ave',
  'Suzzallo Library',
  'Odegaard Library',
  'HUB',
  'The Quad',
  'Allen Library',
  'Local Point',
];

const TIMES = [
  'Today afternoon',
  'Today evening',
  'Tomorrow morning',
  'Tomorrow afternoon',
  'This weekend',
  'Next week',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (body: string) => void;
};

/** Bottom-sheet modal for composing a structured meetup proposal. */
export function MeetupComposerModal({ visible, onClose, onConfirm }: Props) {
  const [location, setLocation] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const reset = () => {
    setLocation(null);
    setTime(null);
  };

  const handleConfirm = () => {
    if (!location || !time) return;
    onConfirm(`📍 Meetup at ${location} · ${time}`);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ThemedText type="subtitle">Suggest a meetup</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Pick a place and a rough time. The other person will see your proposal as a
            message.
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
              PLACE
            </ThemedText>
            <View style={styles.row}>
              {LOCATIONS.map((l) => (
                <Chip
                  key={l}
                  active={location === l}
                  label={l}
                  onPress={() => setLocation(l)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
              TIME
            </ThemedText>
            <View style={styles.row}>
              {TIMES.map((t) => (
                <Chip key={t} active={time === t} label={t} onPress={() => setTime(t)} />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label="Send proposal"
              onPress={handleConfirm}
              disabled={!location || !time}
            />
            <Button label="Cancel" variant="secondary" onPress={handleClose} />
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? Brand.violet500 : Brand.violet100 },
      ]}>
      <ThemedText
        type="small"
        style={{ color: active ? '#FFFFFF' : Brand.violet700 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  section: { gap: Spacing.two },
  label: { letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  actions: { gap: Spacing.two, paddingTop: Spacing.two },
});
