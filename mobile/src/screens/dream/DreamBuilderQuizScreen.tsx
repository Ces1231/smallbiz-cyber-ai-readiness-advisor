import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { submitQuiz, IdeaSuggestion } from '../../api/business';
import { colors } from '../../theme/colors';

// ── Quiz Data ────────────────────────────────────────────────────────────────

const SKILLS_OPTIONS = [
  { key: 'computers_tech', label: 'Computers & Tech' },
  { key: 'sales_marketing', label: 'Sales & Marketing' },
  { key: 'writing_content', label: 'Writing & Content' },
  { key: 'design_creative', label: 'Design & Creative' },
  { key: 'teaching_coaching', label: 'Teaching & Coaching' },
  { key: 'cooking_food', label: 'Cooking & Food' },
  { key: 'trades_repair', label: 'Trades & Repair' },
  { key: 'healthcare_wellness', label: 'Healthcare & Wellness' },
  { key: 'finance_accounting', label: 'Finance & Accounting' },
  { key: 'management_leadership', label: 'Management & Leadership' },
  { key: 'customer_service', label: 'Customer Service' },
  { key: 'languages', label: 'Languages' },
  { key: 'music_arts', label: 'Music & Arts' },
  { key: 'sports_fitness', label: 'Sports & Fitness' },
  { key: 'childcare_education', label: 'Childcare & Education' },
];

const PROBLEMS_OPTIONS = [
  { key: 'save_time', label: 'Help people save time' },
  { key: 'save_money', label: 'Help people save money' },
  { key: 'reduce_stress', label: 'Reduce stress for others' },
  { key: 'learn_something', label: 'Help people learn something new' },
  { key: 'improve_health', label: 'Improve health & wellbeing' },
  { key: 'find_community', label: 'Build community & connection' },
  { key: 'get_entertainment', label: 'Provide entertainment' },
  { key: 'solve_tech_problem', label: 'Solve a tech problem' },
  { key: 'improve_home', label: 'Improve home & living' },
  { key: 'grow_business', label: 'Help businesses grow' },
  { key: 'get_professional_services', label: 'Provide professional services' },
  { key: 'get_local_services', label: 'Provide local services' },
];

const BUSINESS_TYPE_OPTIONS = [
  { key: 'service', label: 'Service Business', sub: 'I provide a service (consulting, cleaning, repairs...)' },
  { key: 'product', label: 'Product Business', sub: 'I sell a physical or digital product' },
  { key: 'online', label: 'Online Business', sub: 'I operate entirely online' },
  { key: 'local', label: 'Local Business', sub: 'I serve my local community' },
];

const CAPITAL_OPTIONS = [
  { key: '<500', label: 'Less than $500' },
  { key: '500-2k', label: '$500 – $2,000' },
  { key: '2k-10k', label: '$2,000 – $10,000' },
  { key: '10k+', label: '$10,000 or more' },
];

const HOURS_OPTIONS = [
  { key: '<5', label: 'Less than 5 hours/week' },
  { key: '5-15', label: '5 – 15 hours/week' },
  { key: '15-30', label: '15 – 30 hours/week' },
  { key: '30+', label: '30+ hours/week' },
];

// ── Screen ───────────────────────────────────────────────────────────────────

export function DreamBuilderQuizScreen({ navigation }: any) {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [capital, setCapital] = useState<string | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = 5;

  function toggleSkill(key: string) {
    setSkills((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleProblem(key: string) {
    setProblems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function isCurrentPageValid(): boolean {
    if (page === 1) return skills.length > 0;
    if (page === 2) return problems.length > 0;
    if (page === 3) return businessType !== null;
    if (page === 4) return capital !== null;
    if (page === 5) return weeklyHours !== null;
    return false;
  }

  function handleNext() {
    if (!isCurrentPageValid()) {
      setError('Please make a selection before continuing.');
      return;
    }
    setError(null);
    if (page < totalPages) {
      setPage((p) => p + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (page > 1) {
      setError(null);
      setPage((p) => p - 1);
    }
  }

  async function handleSubmit() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await submitQuiz(token, {
        skills,
        problems,
        business_type: businessType!,
        starting_capital: capital!,
        weekly_hours: weeklyHours!,
      });
      navigation.navigate('DreamBuilderResults', {
        businessIdeaId: result.business_idea_id,
        suggestions: result.suggestions,
        missionPreview: result.mission_preview,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function renderProgressBar() {
    return (
      <View style={styles.progressBar}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i < page ? styles.progressDotDone : null]}
          />
        ))}
      </View>
    );
  }

  function renderChips(
    options: { key: string; label: string }[],
    selected: string[],
    onToggle: (key: string) => void
  ) {
    return (
      <View style={styles.chipGrid}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, selected.includes(opt.key) ? styles.chipSelected : null]}
            onPress={() => onToggle(opt.key)}
          >
            <Text style={[styles.chipText, selected.includes(opt.key) ? styles.chipTextSelected : null]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderRadio(
    options: { key: string; label: string; sub?: string }[],
    selected: string | null,
    onSelect: (key: string) => void
  ) {
    return (
      <View style={styles.radioGroup}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.radioBtn, selected === opt.key ? styles.radioBtnSelected : null]}
            onPress={() => onSelect(opt.key)}
          >
            <Text style={styles.radioBtnLabel}>{opt.label}</Text>
            {opt.sub && (
              <Text style={styles.radioBtnSub}>{opt.sub}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderPage() {
    switch (page) {
      case 1:
        return (
          <>
            <Text style={styles.questionTitle}>What are your top skills?</Text>
            <Text style={styles.questionSub}>Select all that apply.</Text>
            {renderChips(SKILLS_OPTIONS, skills, toggleSkill)}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.questionTitle}>What problems do you want to solve?</Text>
            <Text style={styles.questionSub}>Select all that apply.</Text>
            {renderChips(PROBLEMS_OPTIONS, problems, toggleProblem)}
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.questionTitle}>What type of business interests you?</Text>
            <Text style={styles.questionSub}>Select one.</Text>
            {renderRadio(BUSINESS_TYPE_OPTIONS, businessType, setBusinessType)}
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.questionTitle}>How much starting capital do you have?</Text>
            <Text style={styles.questionSub}>Select one.</Text>
            {renderRadio(CAPITAL_OPTIONS, capital, setCapital)}
          </>
        );
      case 5:
        return (
          <>
            <Text style={styles.questionTitle}>How many hours per week can you dedicate?</Text>
            <Text style={styles.questionSub}>Select one.</Text>
            {renderRadio(HOURS_OPTIONS, weeklyHours, setWeeklyHours)}
          </>
        );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dream-to-Launch Builder</Text>
        <Text style={styles.headerSub}>Question {page} of {totalPages}</Text>
      </View>
      {renderProgressBar()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderPage()}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.navRow}>
        {page > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={loading}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !isCurrentPageValid() ? styles.nextBtnDisabled : null]}
          onPress={handleNext}
          disabled={loading || !isCurrentPageValid()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>{page === totalPages ? 'Get My Ideas' : 'Next'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  progressBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 16 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotDone: { backgroundColor: colors.cyan },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  questionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  questionSub: { fontSize: 13, color: colors.muted, marginBottom: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  chipSelected: { backgroundColor: 'rgba(34,211,238,0.12)', borderColor: colors.cyan },
  chipText: { fontSize: 13, color: colors.muted },
  chipTextSelected: { color: colors.cyan },
  radioGroup: { gap: 8 },
  radioBtn: {
    padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  radioBtnSelected: { borderColor: colors.cyan, backgroundColor: 'rgba(34,211,238,0.08)' },
  radioBtnLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  radioBtnSub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  error: { color: colors.red, fontSize: 13, marginTop: 12 },
  navRow: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  backBtnText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  nextBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 10,
    backgroundColor: colors.cyan, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#07111f', fontWeight: '700', fontSize: 15 },
});
