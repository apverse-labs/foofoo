import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  searchIngredients, saveAllergens, fetchUserDietRules,
} from '../../src/repositories/onboarding.repository';
import { updateOnboardingStep } from '../../src/repositories/profiles.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import type { IngredientAlias } from '../../src/types';

interface SelectedAllergen {
  alias: string;
  ingredient_id: number;
}

/**
 * @summary Onboarding Step 3 — allergen selection via ingredient search.
 *
 * @description User types ≥2 characters to trigger an ilike search against
 *   ingredient_aliases. Tapping a result chip adds it to the allergen list.
 *   Stores INTEGER ingredient IDs in user_diet_rules.excluded_ingredients —
 *   never text strings. A "No allergies" toggle sets the list to [].
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — step-3 route
 */
export default function OnboardingStep3() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IngredientAlias[]>([]);
  const [selected, setSelected] = useState<SelectedAllergen[]>([]);
  const [noAllergies, setNoAllergies] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
      const rules = await fetchUserDietRules(user.id);
      if (rules) {
        if (rules.excluded_ingredients?.length === 0) setNoAllergies(true);
        // Cannot pre-fill chip labels without alias lookup; leave empty on resume
      }
    })();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchIngredients(query);
      const selectedIds = new Set(selected.map((s) => s.ingredient_id));
      setResults(data.filter((r) => !selectedIds.has(r.ingredient_id)));
      setSearching(false);
    }, 300);
  }, [query, selected]);

  const addAllergen = (item: IngredientAlias) => {
    setSelected((prev) => [...prev, { alias: item.alias, ingredient_id: item.ingredient_id }]);
    setQuery('');
    setResults([]);
    setNoAllergies(false);
  };

  const removeAllergen = (id: number) => {
    setSelected((prev) => prev.filter((s) => s.ingredient_id !== id));
  };

  const handleNoAllergiesToggle = (val: boolean) => {
    setNoAllergies(val);
    if (val) { setSelected([]); setQuery(''); setResults([]); }
  };

  const isNextAllowed = noAllergies || selected.length > 0;

  const handleNext = async () => {
    if (!isNextAllowed || saving) return;
    setSaving(true);
    try {
      const ids = noAllergies ? [] : selected.map((s) => s.ingredient_id);
      await saveAllergens(userId, ids);
      await updateOnboardingStep(userId, 3);
      router.push('/(onboarding)/step-4' as never);
    } catch (err) {
      console.error('[STEP3] save failed:', err);
      Alert.alert('Save failed', 'Could not save your allergens. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={3}
      title="Any food allergies?"
      subtitle="Search for ingredients you're allergic to. We'll make sure they never appear in your plan."
      onNext={handleNext}
      onBack={() => router.back()}
      nextDisabled={!isNextAllowed || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      {/* No allergies toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>I have no food allergies</Text>
        <Switch
          value={noAllergies}
          onValueChange={handleNoAllergiesToggle}
          trackColor={{ true: COLORS.primary, false: COLORS.border }}
          thumbColor="#fff"
        />
      </View>

      {!noAllergies && (
        <>
          {/* Search input */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search ingredients (e.g. peanut, lactose)"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={COLORS.primary} style={styles.spin} />}
          </View>

          {/* Search results */}
          {results.length > 0 && (
            <View style={styles.resultsBox}>
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.ingredient_id)}
                renderItem={({ item }) => (
                  <Pressable style={styles.resultChip} onPress={() => addAllergen(item)}>
                    <Text style={styles.resultChipText}>+ {item.alias}</Text>
                  </Pressable>
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.resultsRow}
              />
            </View>
          )}

          {/* Selected allergens */}
          {selected.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Allergens</Text>
              <View style={styles.chipRow}>
                {selected.map((item) => (
                  <View key={item.ingredient_id} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText}>{item.alias}</Text>
                    <Pressable
                      onPress={() => removeAllergen(item.ingredient_id)}
                      hitSlop={8}
                    >
                      <Text style={styles.removeBtn}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {selected.length === 0 && query.length < 2 && (
            <Text style={styles.emptyHint}>
              Type at least 2 characters to search for allergens.
            </Text>
          )}
        </>
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary, paddingVertical: SPACING.sm + 2 },
  spin: { marginLeft: SPACING.xs },
  resultsBox: { marginTop: SPACING.sm },
  resultsRow: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  resultChip: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    height: 40,
    justifyContent: 'center',
  },
  resultChipText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  section: { marginTop: SPACING.lg },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 40,
  },
  selectedChipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  removeBtn: { fontSize: 12, color: COLORS.error, fontWeight: '700' },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
