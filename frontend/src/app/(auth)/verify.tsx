import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { resendCode, verifyCode } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth-context';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError('');
    setNotice('');
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const session = await verifyCode(email ?? '', code.trim());
      await signIn(session);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    try {
      await resendCode(email ?? '');
      setNotice('A new code is on its way.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend the code.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Verify your UW email</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {`We sent a 6-digit code to ${email ?? 'your UW email'}. Verification keeps HuskyMatch students-only.`}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextField
            label="Verification code"
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
          />
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
          {notice ? (
            <ThemedText type="small" themeColor="textSecondary">
              {notice}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button label="Verify" onPress={handleVerify} loading={loading} />
          <Button label="Resend code" variant="secondary" onPress={handleResend} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: { gap: Spacing.one },
  form: { gap: Spacing.two, marginTop: Spacing.five },
  actions: { gap: Spacing.two },
  error: { color: '#E5484D' },
});
