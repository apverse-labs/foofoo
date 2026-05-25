/**
 * @summary Search tab — full-text dish search with filters, trending, and quick-add.
 *
 * @description
 * Layout:
 *  - SearchBar with filter button (top)
 *  - Active filter chips row + pre-personalised cuisine quick-chips
 *  - Grid of results (2 columns), trending dishes, or EmptySearchState
 *
 * Debounces queries by 400ms. Uses textSearch against dishes.search_vector
 * with synonym expansion via term_synonyms. Long-pressing a card opens the
 * SlotPickerOverlay for quick-add to today's plan.
 *
 * @calledBy Expo Router tabs
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
  useWindowDimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, TIMING } from '../../src/config/constants';
import { supabase } from '../../src/services/supabase';
import {
  searchDishes, getTrendingDishes, getUserPersonalisedCuisines, logSearchEvent,
  type SearchResult, type SearchFilters, type CuisineOption,
} from '../../src/repositories/search.repository';
import { logScreenView } from '../../src/repositories/feedback.repository';
import { PostHogService } from '../../src/services/posthog.service';
import { Logger } from '../../src/utils/systemLogger';
import { getTodayIST } from '../../src/repositories/plans.repository';
import SearchBar from '../../src/components/search/SearchBar';
import SearchResultCard from '../../src/components/search/SearchResultCard';
import FilterBottomSheet from '../../src/components/search/FilterBottomSheet';
import EmptySearchState from '../../src/components/search/EmptySearchState';
import SlotPickerOverlay from '../../src/components/search/SlotPickerOverlay';

/**
 * @summary Counts how many filter categories have at least one selected value.
 * @param {SearchFilters} filters - current filter state
 * @returns {number} count of populated filter categories (0..4)
 */
function countActiveFilters(filters: SearchFilters): number {
  let n = 0;
  if (filters.dietTypes?.length) n++;
  if (filters.cuisineIds?.length) n++;
  if (filters.mealTypes?.length) n++;
  if (filters.spiceLevels?.length) n++;
  return n;
}

/**
 * @summary Returns the names of filter categories currently in use.
 * @param {SearchFilters} filters - current filter state
 * @returns {string[]} category names (subset of diet|cuisine|meal|spice)
 */
function activeFilterNames(filters: SearchFilters): string[] {
  const out: string[] = [];
  if (filters.dietTypes?.length) out.push('diet');
  if (filters.cuisineIds?.length) out.push('cuisine');
  if (filters.mealTypes?.length) out.push('meal');
  if (filters.spiceLevels?.length) out.push('spice');
  return out;
}

export default function SearchTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [userId, setUserId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [personalisedCuisines, setPersonalisedCuisines] = useState<CuisineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [slotPickerDish, setSlotPickerDish] = useState<SearchResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auth + screen-view + personalised cuisines + trending (mount-only)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const uid = data.user?.id ?? '';
      setUserId(uid);
      if (uid) {
        logScreenView(uid, 'search');
        PostHogService.screen('search');
        const [cuisines, trend] = await Promise.all([
          getUserPersonalisedCuisines(uid),
          getTrendingDishes(10),
        ]);
        if (!mounted) return;
        setPersonalisedCuisines(cuisines);
        setTrending(trend);
      } else {
        const trend = await getTrendingDishes(10);
        if (mounted) setTrending(trend);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Debounce search input (400ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(id);
  }, [query]);

  // Run the search whenever the debounced query or filters change
  useEffect(() => {
    let cancelled = false;
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const hits = await searchDishes(trimmed, filters, 30, 0);
        if (cancelled) return;
        setResults(hits);
        if (userId) {
          logSearchEvent(userId, trimmed, hits.length, activeFilterNames(filters));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error('SEARCH-TAB', 'searchDishes failed', { error: msg, query: trimmed });
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, filters, userId]);

  // 2-column grid widths: account for outer padding + inter-card gap
  const cardWidth = useMemo(() => {
    const contentWidth = Math.min(width, 700);
    const outerPad = SPACING.md * 2;
    const gap = SPACING.sm;
    return Math.floor((contentWidth - outerPad - gap) / 2);
  }, [width]);

  const handleResultPress = useCallback((dish: SearchResult) => {
    router.push(`/dish/${dish.id}` as never);
  }, [router]);

  const handleLongPress = useCallback((dish: SearchResult) => {
    setSlotPickerDish(dish);
  }, []);

  const handleCuisineChipPress = useCallback((c: CuisineOption) => {
    setFilters(prev => {
      const cur = prev.cuisineIds ?? [];
      return {
        ...prev,
        cuisineIds: cur.includes(c.id) ? cur.filter(id => id !== c.id) : [...cur, c.id],
      };
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), TIMING.TOAST_DISMISS_MS);
  }, []);

  const activeCount = countActiveFilters(filters);
  const trimmed = debouncedQuery.trim();
  const isInitial = trimmed.length === 0;
  const isTooShort = trimmed.length === 1;
  const hasResults = results.length > 0;
  const trendingVisible = isInitial && trending.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={() => setQuery('')}
        onOpenFilters={() => setFilterOpen(true)}
        activeFilterCount={activeCount}
      />

      {/* Pre-personalised cuisine chips (only when search empty) */}
      {isInitial && personalisedCuisines.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {personalisedCuisines.map(c => {
            const active = filters.cuisineIds?.includes(c.id) ?? false;
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleCuisineChipPress(c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.display_name ?? c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Loading row */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        )}

        {/* Search results */}
        {!loading && !isInitial && !isTooShort && hasResults && (
          <View style={styles.grid}>
            {results.map(d => (
              <SearchResultCard
                key={d.id}
                dish={d}
                width={cardWidth}
                onPress={() => handleResultPress(d)}
                onLongPress={() => handleLongPress(d)}
              />
            ))}
          </View>
        )}

        {/* No results state */}
        {!loading && !isInitial && !isTooShort && !hasResults && (
          <>
            <EmptySearchState mode="no_results" query={trimmed} />
            {trending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>You might like these instead</Text>
                <View style={styles.grid}>
                  {trending.slice(0, 4).map(d => (
                    <SearchResultCard
                      key={d.id}
                      dish={d}
                      width={cardWidth}
                      onPress={() => handleResultPress(d)}
                      onLongPress={() => handleLongPress(d)}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Too-short hint */}
        {!loading && isTooShort && <EmptySearchState mode="too_short" />}

        {/* Initial / empty query → trending */}
        {!loading && isInitial && (
          <>
            <EmptySearchState mode="initial" />
            {trendingVisible && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular Today</Text>
                <View style={styles.grid}>
                  {trending.map(d => (
                    <SearchResultCard
                      key={d.id}
                      dish={d}
                      width={cardWidth}
                      onPress={() => handleResultPress(d)}
                      onLongPress={() => handleLongPress(d)}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <FilterBottomSheet
        visible={filterOpen}
        initial={filters}
        onApply={(next) => { setFilters(next); setFilterOpen(false); }}
        onClose={() => setFilterOpen(false)}
      />

      {slotPickerDish && (
        <SlotPickerOverlay
          dish={slotPickerDish}
          userId={userId}
          planDate={getTodayIST()}
          onClose={() => setSlotPickerDish(null)}
          onSuccess={(slot) => {
            setSlotPickerDish(null);
            showToast(`Added to today's ${slot}!`);
          }}
        />
      )}

      {toast && (
        <View style={[styles.toast, { bottom: insets.bottom + 16 }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.md },
  loadingRow: { paddingVertical: SPACING.xl, alignItems: 'center' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'flex-start',
  },
  section: { gap: SPACING.sm, marginTop: SPACING.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  toast: {
    position: 'absolute', left: SPACING.lg, right: SPACING.lg,
    backgroundColor: COLORS.textPrimary,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(0,0,0,0.2)' } : {
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    }),
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
