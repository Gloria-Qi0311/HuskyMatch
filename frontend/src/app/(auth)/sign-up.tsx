import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { signUp } from '@/lib/auth-api';

const UW_EMAIL = /^[^\s@]+@(?:[a-z0-9-]+\.)?uw\.edu$/i;

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!UW_EMAIL.test(cleanEmail)) {
      setError('Use your UW email address (must end in @uw.edu).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(name.trim(), cleanEmail, password);
      router.push({ pathname: '/verify', params: { email: cleanEmail } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create your account.');
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
            <View style={styles.header}>
              <ThemedText type="subtitle">Create your account</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Only @uw.edu emails are accepted. We never show your email to other members.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <TextField
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Mira Chen"
                autoCapitalize="words"
              />
              <TextField
                label="UW email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@uw.edu"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="new-password"
              />
              {error ? (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.actions}>
              <Button label="Continue" onPress={handleSignUp} loading={loading} />
              <Button
                label="I already have an account"
                variant="secondary"
                onPress={() => router.replace('/sign-in')}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.five },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'space-between', gap: Spacing.five },
  header: { gap: Spacing.one },
  form: { gap: Spacing.three },
  actions: { gap: Spacing.two },
  error: { color: '#E5484D' },
});
