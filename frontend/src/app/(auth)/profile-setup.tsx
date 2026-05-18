import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TagPicker } from '@/components/ui/tag-picker';
import { TextField } from '@/components/ui/text-field';
import { Brand, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { updateProfile } from '@/lib/profile-api';

const INTEREST_OPTIONS = [
  'Startups', 'AI / ML', 'Design', 'Research', 'Music', 'Film',
  'Hiking', 'Climbing', 'Photography', 'Gaming', 'Cooking', 'Sports',
  'Reading', 'Volunteering', 'Dance', 'Entrepreneurship',
];
const SKILL_OPTIONS = [
  'Python', 'JavaScript', 'React', 'Data analysis', 'UI / UX', 'Figma',
  'Machine learning', 'SQL', 'Writing', 'Public speaking', 'Marketing', 'Leadership',
];
const STEP_COUNT = 3;

export default function ProfileSetupScreen() {
  const { userId, name, email } = useLocalSearchParams<{
    userId: string;
    name: string;
    email: string;
  }>();
  const { signIn } = useAuth();

  const [step, setStep] = useState(0);
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [school, setSchool] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (list: string[], setList: (next: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleNext = () => {
    setError('');
    if (step === 0 && (!year.trim() || !major.trim() || !school.trim())) {
      setError('Fill in your year, major, and school.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };

  const handleFinish = async () => {
    setError('');
    setLoading(true);
    try {
      await updateProfile(Number(userId), {
        year: year.trim(),
        major: major.trim(),
        schoolName: school.trim(),
        interests,
        skills,
      });
      await signIn({ userId: Number(userId), name: name ?? '', email: email ?? '' });
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = step === STEP_COUNT - 1;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / STEP_COUNT) * 100}%` }]} />
          </View>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {`Step ${step + 1} of ${STEP_COUNT}`}
          </ThemedText>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {step === 0 ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">The basics</ThemedText>
                <TextField label="Year" value={year} onChangeText={setYear} placeholder="e.g. Junior" />
                <TextField label="Major" value={major} onChangeText={setMajor} placeholder="e.g. Informatics" />
                <TextField
                  label="School / college"
                  value={school}
                  onChangeText={setSchool}
                  placeholder="e.g. The Information School"
                />
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">Your interests</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  Pick what you&apos;re into — this powers your matches.
                </ThemedText>
                <TagPicker
                  options={INTEREST_OPTIONS}
                  selected={interests}
                  onToggle={(v) => toggle(interests, setInterests, v)}
                />
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">Your skills</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  What can you bring to a project or study group?
                </ThemedText>
                <TagPicker
                  options={SKILL_OPTIONS}
                  selected={skills}
                  onToggle={(v) => toggle(skills, setSkills, v)}
                />
              </View>
            ) : null}

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {isLastStep ? (
              <Button label="Finish" onPress={handleFinish} loading={loading} />
            ) : (
              <Button label="Continue" onPress={handleNext} />
            )}
            {step > 0 ? (
              <Button
                label="Back"
                variant="secondary"
                onPress={() => {
                  setError('');
                  setStep((s) => Math.max(s - 1, 0));
                }}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.five },
  flex: { flex: 1, gap: Spacing.two },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Brand.violet100,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: Brand.violet500 },
  scroll: { flexGrow: 1, paddingTop: Spacing.three },
  section: { gap: Spacing.three },
  actions: { gap: Spacing.two },
  error: { color: '#E5484D', marginTop: Spacing.three },
});
