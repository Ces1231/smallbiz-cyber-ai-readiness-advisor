import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, AppState,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { createOneTimeCheckout, getPurchaseStatus } from '../../api/business';
import { colors } from '../../theme/colors';

/**
 * DreamBuilderUpgradeScreen
 *
 * Payment approach: Web checkout fallback.
 * @stripe/stripe-react-native is not installed.
 * The backend returns a PaymentIntent client_secret.
 * We redirect the user to dream-builder.html (web) where Stripe Payment Element is integrated.
 * After returning to the app, we poll GET /billing/purchases to confirm purchase.
 */

const PRODUCT_INFO: Record<string, { title: string; price: string; description: string; features: string[] }> = {
  launch_builder: {
    title: 'Launch Builder',
    price: '$19',
    description: 'Full startup checklist, startup cost calculator, pricing builder, and 30-day launch plan.',
    features: [
      'Full legal & setup checklist',
      'Itemized startup cost calculator',
      '3 pricing packages',
      '30-day week-by-week plan',
    ],
  },
  launch_packet_pro: {
    title: 'Launch Packet Pro',
    price: '$49',
    description: 'Everything in Launch Builder plus a full AI-generated business plan, customer persona, 90-day roadmap, and PDF export.',
    features: [
      'Everything in Launch Builder',
      'AI business plan (8–12 pages)',
      'Customer persona builder',
      '90-day roadmap',
      'Funding readiness checklist',
      'Cyber & AI starter kit',
      'PDF export',
    ],
  },
  advisor_review: {
    title: 'Advisor Review',
    price: '$149',
    description: "A 1-on-1 review session with a Champtron Systems advisor. You'll receive a scheduling link within 1 business day.",
    features: [
      'Personal advisor session',
      'Custom recommendations',
      'Scheduling link via email',
    ],
  },
};

export function DreamBuilderUpgradeScreen({ navigation, route }: any) {
  const { token } = useAuthStore();
  const { businessIdeaId, productKey } = route.params as {
    businessIdeaId: string;
    productKey: 'launch_builder' | 'launch_packet_pro' | 'advisor_review';
  };

  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webOpened, setWebOpened] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const info = PRODUCT_INFO[productKey];

  // When app comes back to foreground after opening web checkout, poll for purchase
  useEffect(() => {
    if (!webOpened) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'background' && nextState === 'active') {
        startPolling();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [webOpened]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleOpenWebCheckout() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Create payment intent on backend so purchase row is created
      await createOneTimeCheckout(token, productKey);
      // Open the dream builder web page where user can complete payment
      const webUrl = process.env.EXPO_PUBLIC_WEB_URL
        ? `${process.env.EXPO_PUBLIC_WEB_URL}/dream-builder.html?upgrade=${productKey}`
        : `http://localhost:3000/dream-builder.html?upgrade=${productKey}`;
      await Linking.openURL(webUrl);
      setWebOpened(true);
    } catch (e: any) {
      if (e?.status === 409) {
        setError('You have already purchased this product.');
      } else {
        setError(e?.message ?? 'Failed to initiate checkout. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    if (!token) return;
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 10;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const status = await getPurchaseStatus(token);
        if (status[productKey as keyof typeof status]) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPolling(false);
          // Navigate back to plan screen with updated tier
          if (productKey === 'advisor_review') {
            navigation.goBack();
          } else {
            navigation.navigate('DreamBuilderPlan', {
              businessIdeaId,
              savedIdea: route.params.savedIdea ?? {},
              tier: productKey,
            });
          }
        }
      } catch (_) {}
      if (attempts >= maxAttempts) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPolling(false);
      }
    }, 3000);
  }

  function handleCheckPurchase() {
    startPolling();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.productCard}>
          <Text style={styles.productTitle}>{info.title}</Text>
          <Text style={styles.productPrice}>{info.price}</Text>
          <Text style={styles.productDesc}>{info.description}</Text>
          <View style={styles.featureList}>
            {info.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {!webOpened ? (
          <>
            <Text style={styles.webNote}>
              Payment is completed securely on our web portal. Tap below to open it.
            </Text>
            <TouchableOpacity
              style={[styles.payBtn, loading ? styles.payBtnDisabled : null]}
              onPress={handleOpenWebCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#07111f" />
              ) : (
                <Text style={styles.payBtnText}>Pay {info.price} — Open Checkout</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.webNote}>
              Complete the payment in the browser that just opened, then return here and tap the button below.
            </Text>
            {polling ? (
              <View style={styles.pollingBox}>
                <ActivityIndicator color={colors.cyan} />
                <Text style={styles.pollingText}>Checking for your purchase...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.payBtn} onPress={handleCheckPurchase}>
                <Text style={styles.payBtnText}>I completed payment — Continue</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  productCard: {
    backgroundColor: colors.panel, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 20, marginBottom: 24,
  },
  productTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  productPrice: { fontSize: 28, fontWeight: '700', color: colors.cyan, marginBottom: 10 },
  productDesc: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 16 },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureCheck: { color: colors.green, fontSize: 15, marginTop: 1 },
  featureText: { flex: 1, fontSize: 14, color: colors.text },
  webNote: { fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 16, textAlign: 'center' },
  payBtn: {
    backgroundColor: colors.cyan, borderRadius: 10,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#07111f', fontWeight: '700', fontSize: 16 },
  pollingBox: { alignItems: 'center', padding: 20, gap: 10 },
  pollingText: { color: colors.muted, fontSize: 13 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.muted, fontSize: 14 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12, textAlign: 'center' },
});
