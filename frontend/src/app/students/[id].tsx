import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { StudentProfileView } from '@/components/student-profile-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { fetchStudent, type Student } from '@/lib/profile-api';

export default function OtherStudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchStudent(Number(id))
      .then(setStudent)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Could not load profile.'),
      );
  }, [id]);

  if (!student) {
    return (
      <ThemedView style={styles.loading}>
        <ThemedText themeColor="textSecondary">{error || 'Loading…'}</ThemedText>
      </ThemedView>
    );
  }

  const handleMessage = () => {
    Alert.alert('Coming soon', 'Messaging will be available in the next issue.');
  };

  const handleReportBlock = () => {
    Alert.alert(
      'Coming soon',
      'Report and block actions will be available once the moderation backend lands.',
    );
  };

  return (
    <StudentProfileView
      student={student}
      actions={
        <>
          <Button label="Message" onPress={handleMessage} />
          <Button label="Report or block" variant="secondary" onPress={handleReportBlock} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
