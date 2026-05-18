import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { signIn as apiSignIn } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const session = await apiSignIn(email.trim().toLowerCase(), password);
      await signIn(session);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in. Try again.');
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
          <View style={styles.header}>
            <ThemedText type="subtitle">Welcome back</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Sign in to your HuskyMatch account.
            </ThemedText>
          </View>

          <View style={styles.form}>
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
              placeholder="Your password"
              secureTextEntry
              autoComplete="password"
            />
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button label="Sign in" onPress={handleSignIn} loading={loading} />
            <Button
              label="Create an account"
              variant="secondary"
              onPress={() => router.replace('/sign-up')}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.five },
  flex: { flex: 1, justifyContent: 'space-between' },
  header: { gap: Spacing.one },
  form: { gap: Spacing.three, marginTop: Spacing.five },
  actions: { gap: Spacing.two },
  error: { color: '#E5484D' },
});
