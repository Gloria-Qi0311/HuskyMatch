import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StudentListItem } from '@/components/student-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Student } from '@/lib/profile-api';
import { searchStudents } from '@/lib/search-api';

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      searchStudents(trimmed)
        .then((rows) => {
          const filtered = session
            ? rows.filter((s) => s.userId !== session.userId)
            : rows;
          setResults(filtered);
          setError('');
        })
        .catch((e) => {
          setResults([]);
          setError(e instanceof ApiError ? e.message : 'Search failed.');
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [trimmed, session]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, major, interests…"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: theme.text }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(s) => String(s.userId)}
          renderItem={({ item }) => <StudentListItem student={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              {!trimmed ? (
                <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
                  Find classmates by name, major, interests, or skills.
                </ThemedText>
              ) : loading ? (
                <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
                  Searching…
                </ThemedText>
              ) : error ? (
                <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
                  {error}
                </ThemedText>
              ) : (
                <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
                  No Huskies match &ldquo;{trimmed}&rdquo;.
                </ThemedText>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  back: { padding: 4 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: 999,
  },
  input: { flex: 1, fontSize: 16 },
  list: { padding: Spacing.three },
  sep: { height: Spacing.two },
  empty: { padding: Spacing.five },
  center: { textAlign: 'center' },
});
