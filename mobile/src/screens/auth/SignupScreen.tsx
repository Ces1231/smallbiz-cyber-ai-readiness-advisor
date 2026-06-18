import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation, route }: Props) {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup, isLoading, error, clearError, setPendingStartupRedirect } = useAuthStore();
  const isStartup = route.params?.isStartup ?? false;

  async function handleSignup() {
    if (!businessName.trim() || !email.trim() || !password) return;
    try {
      clearError();
      if (isStartup) {
        setPendingStartupRedirect(true);
      }
      await signup(email.trim(), password, businessName.trim());
    } catch {
      setPendingStartupRedirect(false);
      // error in store
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.sub}>Get your free readiness assessment</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Your Business LLC"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@business.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry
            />

            <View style={{ height: 8 }} />
            <Button title="Create Account" onPress={handleSignup} loading={isLoading} />

            <Button
              title="Already have an account? Sign in"
              variant="ghost"
              onPress={() => navigation.navigate('Login', { isStartup })}
              style={{ marginTop: 12 }}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 40 },
  heading: { color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, marginBottom: 6 },
  sub: { color: colors.muted, fontSize: typography.sizes.base, marginBottom: 32 },
  label: { color: colors.muted, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, color: colors.text, fontSize: typography.sizes.base, marginBottom: 16 },
  error: { color: colors.red, backgroundColor: 'rgba(251,113,133,0.1)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: typography.sizes.sm },
});
