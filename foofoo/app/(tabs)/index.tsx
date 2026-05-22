/**
 * @summary Home screen — Day View (today's B/L/D) or Week View grid.
 *
 * @description
 * Primary screen. Default mode is Day View — 3 MealCards driven by
 * useHomeScreen(). User can toggle to Week View, a 7-day × 3-slot grid that
 * shows planned dishes and lets future days be generated with one tap.
 * Tapping a day in Week View jumps Day View to that date.
 *
 * @calledBy Expo Router — default tab screen
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import MealCard from '../../src/components/dish/MealCard';
import GestureTutorial from '../../src/components/shared/GestureTutorial';
import NeverModal from '../../src/components/dish/NeverModal';
import NotTodayModal from '../../src/components/dish/NotTodayModal';
import WeekView from '../../src/components/planner/WeekView';
import { LoadingScreen, ErrorState, EmptyState } from './_HomeScreen.helpers';
import { useHomeScreen } from './_useHomeScreen';
import { useResponsive } from '../../src/utils/responsive';
import { PostHogService } from '../../src/services/posthog.service';

type ViewMode = 'day' | 'week';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { contentWidth } = useResponsive();
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  useEffect(() => {
    PostHogService.screen('home', { viewMode });
  }, [viewMode]);
  const {
    planDate, plan, carousels, lockedSlots,
    loading, refreshing, error, showTutorial, userId,
    neverDish, neverSlot, notTodayDish, notTodaySlot,
    displayDate,
    setShowTutorial, setNeverDish, setNeverSlot, setNotTodayDish, setNotTodaySlot,
    setPlanDateExternal,
    handleTitlePress, loadPlan, onRefresh,
    handleDishChange, handleLock, handleOpenDetail, navigateDate,
    handleNeverConfirmed, handleNotTodayConfirmed,
    GESTURE_TUTORIAL_KEY,
  } = useHomeScreen();

  if (loading && !refreshing && viewMode === 'day') {
    return <LoadingScreen insetTop={insets.top} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
     <View style={[styles.contentColumn, { maxWidth: contentWidth }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleTitlePress} hitSlop={8}>
          <Text style={styles.appName}>Foofoo</Text>
        </Pressable>
        <View style={styles.topActions}>
          <Text style={styles.topIcon}>🔔</Text>
          <Text style={styles.topIcon}>🔍</Text>
        </View>
      </View>

      {/* Day/Week toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'day' && styles.toggleBtnActive]}
          onPress={() => setViewMode('day')}
          accessibilityLabel="Day view"
        >
          <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>
            Day
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
          onPress={() => setViewMode('week')}
          accessibilityLabel="Week view"
        >
          <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
            Week
          </Text>
        </Pressable>
      </View>

      {viewMode === 'day' ? (
        <>
          {/* Date navigator */}
          <View style={styles.dateNav}>
            <Pressable onPress={() => navigateDate('prev')} hitSlop={12}>
              <Text style={styles.dateArrow}>◀</Text>
            </Pressable>
            <Text style={styles.dateText}>{displayDate}</Text>
            <Pressable onPress={() => navigateDate('next')} hitSlop={12}>
              <Text style={styles.dateArrow}>▶</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          >
            {error ? (
              <ErrorState message={error} onRetry={() => loadPlan(false)} />
            ) : plan ? (
              <>
                {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => {
                  const slotData = plan[slot];
                  return (
                    <View key={slot} style={styles.cardWrapper}>
                      <MealCard
                        dish={slotData.dish}
                        carouselDishes={carousels[slot]}
                        mealSlot={slot}
                        planDate={planDate}
                        userId={userId ?? ''}
                        isLocked={lockedSlots.includes(slot)}
                        onLock={handleLock(slot)}
                        onDishChange={handleDishChange(slot)}
                        onOpenDetail={handleOpenDetail}
                        onNever={(dish) => { setNeverDish(dish); setNeverSlot(slot); }}
                        onNotToday={(dish) => { setNotTodayDish(dish); setNotTodaySlot(slot); }}
                      />
                      <Text style={styles.carouselHint}>
                        Swipe to explore {slotData.carouselCount} options
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <EmptyState />
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <WeekView
            userId={userId ?? ''}
            initialDate={planDate}
            onDaySelect={(date) => {
              setPlanDateExternal(date);
              setViewMode('day');
            }}
          />
        </ScrollView>
      )}

     </View>

      {showTutorial && (
        <GestureTutorial
          onDismiss={async () => {
            await AsyncStorage.setItem(GESTURE_TUTORIAL_KEY, 'true');
            setShowTutorial(false);
          }}
        />
      )}

      {neverDish && (
        <NeverModal
          dish={neverDish}
          userId={userId ?? ''}
          planDate={planDate}
          mealSlot={neverSlot}
          onConfirm={handleNeverConfirmed}
          onCancel={() => { setNeverDish(null); setNeverSlot(''); }}
        />
      )}

      {notTodayDish && (
        <NotTodayModal
          dish={notTodayDish}
          userId={userId ?? ''}
          planDate={planDate}
          mealSlot={notTodaySlot}
          onConfirm={handleNotTodayConfirmed}
          onCancel={() => { setNotTodayDish(null); setNotTodaySlot(''); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
  contentColumn: { width: '100%', flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  appName: { fontSize: 24, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  topActions: { flexDirection: 'row', gap: SPACING.md },
  topIcon: { fontSize: 20 },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 3,
    gap: 2,
    marginBottom: SPACING.sm,
  },
  toggleBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: '#fff' },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.lg, paddingVertical: SPACING.sm,
  },
  dateArrow: { fontSize: 14, color: COLORS.textSecondary },
  dateText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { gap: SPACING.md, paddingTop: SPACING.sm, paddingHorizontal: SPACING.md, alignItems: 'center' },
  cardWrapper: { gap: 6, alignItems: 'center' },
  carouselHint: { textAlign: 'center', fontSize: 11, color: COLORS.textSecondary },
});
