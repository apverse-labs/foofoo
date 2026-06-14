/**
 * useREHome.ts — TanStack Query hooks for the RE home page (UI-BUILD-05).
 *
 * All RE access goes through the resolver service (re-engine.service) — never a specific engine version.
 * Feedback uses optimistic-friendly invalidation. No raw SQL, no DB schema knowledge in the UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayView, generateWeeklyPlan, submitFeedback } from '../../../services/re-engine.service';
import type { REFeedbackSignal } from '../../../types';

export const RE_HOME_KEY = (userId: string) => ['re', 'today', userId] as const;

/** Today's class-first plan + dish candidates + add-ons via getTodayView. */
export function useTodayView(userId: string) {
  return useQuery({
    queryKey: RE_HOME_KEY(userId),
    queryFn: () => getTodayView(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Trigger (re)generation of the weekly plan; invalidates today's view. */
export function useGenerateWeeklyPlan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (forceRegenerate?: boolean) => generateWeeklyPlan(userId, forceRegenerate ?? false),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RE_HOME_KEY(userId) }); },
  });
}

export interface FeedbackInput {
  dishOptionId: string;
  mealClassCode: string;
  signal: REFeedbackSignal;
}

/** Record a feedback signal through the resolver; refresh today's view after. */
export function useSubmitFeedback(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dishOptionId, mealClassCode, signal }: FeedbackInput) =>
      submitFeedback(userId, dishOptionId, mealClassCode, signal),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RE_HOME_KEY(userId) }); },
  });
}
