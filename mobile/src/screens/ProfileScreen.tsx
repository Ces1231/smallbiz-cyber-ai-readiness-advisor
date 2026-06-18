import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function ProfileScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.label}>Business</Text>
          <Text style={styles.value}>{user?.business_name ?? '—'}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>App Version</Text>
          <Text style={styles.value}>1.0.0</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Powered by</Text>
          <Text style={styles.value}>Champtron Systems LLC</Text>
        </Card>

        <Button title="Sign Out" variant="danger" onPress={handleLogout} style={styles.logout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20, gap: 16 },
  card: { gap: 6 },
  label: { color: colors.muted, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { color: colors.text, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  logout: { marginTop: 'auto' as any },
});
