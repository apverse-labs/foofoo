/**
 * @summary Bottom-sheet for picking search filters: diet, cuisine, meal, spice.
 *
 * @description
 * Opens from the SearchBar filter icon. Loads available filter options from
 * search.repository.getFilterOptions on mount. Local-state edits are
 * committed only when the user taps "Show results"; on "Clear all" the local
 * draft resets but the parent state isn't touched until Show results.
 *
 * @calledBy app/(tabs)/search.tsx
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import {
  getFilterOptions,
  type FilterOptions,
  type SearchFilters,
} from '../../repositories/search.repository';
import type { DietType, MealSlot } from '../../types';

interface Props {
  visible: boolean;
  initial: SearchFilters;
  onApply: (next: SearchFilters) => void;
  onClose: () => void;
}

const MEAL_TYPES: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const SPICE_LEVELS = [
  { value: 1, label: '🌶 Mild' },
  { value: 2, label: '🌶🌶 Medium' },
  { value: 3, label: '🌶🌶🌶 Spicy' },
  { value: 4, label: '🔥 Very Spicy' },
];

/**
 * @summary Toggles a value in a primitive-array list.
 * @template T
 * @param {T[]} list - existing list
 * @param {T} value - value to toggle
 * @returns {T[]} new list
 */
function toggle<T>(list: T[] | undefined, value: T): T[] {
  const cur = list ?? [];
  return cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
}

/**
 * @summary Renders the FilterBottomSheet modal.
 * @param {Props} props - visibility, initial filters, callbacks
 * @returns {JSX.Element | null}
 */
export default function FilterBottomSheet({ visible, initial, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<SearchFilters>(initial);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
  }, [visible, initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const opts = await getFilterOptions();
      if (!cancelled) {
        setOptions(opts);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const clearAll = useCallback(() => setDraft({}), []);
  const apply = useCallback(() => onApply(draft), [draft, onApply]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          </View>

          {loading || !options ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Section title="Diet">
                <View style={styles.pillRow}>
                  {options.dietTypes.map(d => {
                    const active = draft.dietTypes?.includes(d.value) ?? false;
                    return (
                      <Pill
                        key={d.value}
                        label={d.label}
                        active={active}
                        onPress={() => setDraft({
                          ...draft,
                          dietTypes: toggle<DietType>(draft.dietTypes, d.value),
                        })}
                      />
                    );
                  })}
                </View>
              </Section>

              <Section title="Meal Type">
                <View style={styles.pillRow}>
                  {MEAL_TYPES.map(m => {
                    const active = draft.mealTypes?.includes(m.value) ?? false;
                    return (
                      <Pill
                        key={m.value}
                        label={m.label}
                        active={active}
                        onPress={() => setDraft({
                          ...draft,
                          mealTypes: toggle<MealSlot>(draft.mealTypes, m.value),
                        })}
                      />
                    );
                  })}
                </View>
              </Section>

              <Section title="Spice Level">
                <View style={styles.pillRow}>
                  {SPICE_LEVELS.map(s => {
                    const active = draft.spiceLevels?.includes(s.value) ?? false;
                    return (
                      <Pill
                        key={s.value}
                        label={s.label}
                        active={active}
                        onPress={() => setDraft({
                          ...draft,
                          spiceLevels: toggle<number>(draft.spiceLevels, s.value),
                        })}
                      />
                    );
                  })}
                </View>
              </Section>

              <Section title={`Cuisine · ${options.cuisines.length}`}>
                <View style={styles.pillRow}>
                  {options.cuisines.map(c => {
                    const active = draft.cuisineIds?.includes(c.id) ?? false;
                    return (
                      <Pill
                        key={c.id}
                        label={c.display_name ?? c.name}
                        active={active}
                        onPress={() => setDraft({
                          ...draft,
                          cuisineIds: toggle<number>(draft.cuisineIds, c.id),
                        })}
                      />
                    );
                  })}
                </View>
              </Section>
              <View style={{ height: SPACING.xl }} />
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.applyBtn} onPress={apply}>
              <Text style={styles.applyText}>Show results</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * @summary Renders a labelled section of the filter sheet.
 * @param {{ title: string; children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * @summary Renders a single tappable filter pill.
 * @param {{ label: string; active: boolean; onPress: () => void }} props
 * @returns {JSX.Element}
 */
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: SPACING.sm,
    paddingBottom: 32,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  clearAll: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  body: { paddingHorizontal: SPACING.lg },
  section: { gap: SPACING.sm, marginTop: SPACING.md },
  sectionTitle: {
    fontSize: 12, fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pill: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#F1F3F2',
    borderWidth: 1, borderColor: 'transparent',
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: '#fff' },
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
