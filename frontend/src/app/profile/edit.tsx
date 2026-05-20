import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TagPicker } from '@/components/ui/tag-picker';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fetchStudent, updateProfile } from '@/lib/profile-api';

const INTEREST_OPTIONS = [
  'Startups', 'AI / ML', 'Design', 'Research', 'Music', 'Film',
  'Hiking', 'Climbing', 'Photography', 'Gaming', 'Cooking', 'Sports',
  'Reading', 'Volunteering', 'Dance', 'Entrepreneurship',
];
const SKILL_OPTIONS = [
  'Python', 'JavaScript', 'React', 'Data analysis', 'UI / UX', 'Figma',
  'Machine learning', 'SQL', 'Writing', 'Public speaking', 'Marketing', 'Leadership',
];

export default function EditProfileScreen() {
  const { session } = useAuth();
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [school, setSchool] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetchStudent(session.userId)
      .then((s) => {
        setYear(s.year ?? '');
        setMajor(s.major ?? '');
        setSchool(s.schoolName ?? '');
        setInterests(
          (s.interests ?? '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
        );
        setSkills(s.skills ?? []);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Could not load profile.'),
      )
      .finally(() => setInitialLoading(false));
  }, [session]);

  if (!session) return null;

  const toggle = (
    list: string[],
    setList: (next: string[]) => void,
    value: string,
  ) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      await updateProfile(session.userId, {
        year: year.trim(),
        major: major.trim(),
        schoolName: school.trim(),
        interests,
        skills,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Edit profile</ThemedText>

            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                BASICS
              </ThemedText>
              <TextField
                label="Year"
                value={year}
                onChangeText={setYear}
                placeholder="e.g. Junior"
                editable={!initialLoading}
              />
              <TextField
                label="Major"
                value={major}
                onChangeText={setMajor}
                placeholder="e.g. Informatics"
                editable={!initialLoading}
              />
              <TextField
                label="School / college"
                value={school}
                onChangeText={setSchool}
                placeholder="e.g. The Information School"
                editable={!initialLoading}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                INTERESTS
              </ThemedText>
              <TagPicker
                options={INTEREST_OPTIONS}
                selected={interests}
                onToggle={(v) => toggle(interests, setInterests, v)}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                SKILLS
              </ThemedText>
              <TagPicker
                options={SKILL_OPTIONS}
                selected={skills}
                onToggle={(v) => toggle(skills, setSkills, v)}
              />
            </View>

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button label="Save" onPress={handleSave} loading={loading} />
            <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.four },
  flex: { flex: 1 },
  scroll: { gap: Spacing.four, paddingBottom: Spacing.four },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 0.5 },
  actions: { gap: Spacing.two, paddingTop: Spacing.three },
  error: { color: '#E5484D' },
});
