// DOC-23 / BUILD-08: Stable contract that all RE engine versions must implement.
// The app never imports a specific version (RE_V1, RE_V2 …) directly.
// All version dispatch is internal to the resolver layer.

import type {
  REDayPlan,
  REDayDishCandidates,
  REFeedbackSignal,
  RESlotAddons,
  REWeeklyPlan,
} from '../../types';

export interface REGenerateWeeklyPlanInput {
  userId: string;
  forceRegenerate?: boolean;
}

export interface RETodayViewInput {
  userId: string;
}

export interface RETodayView {
  dayPlan: REDayPlan | null;
  weekStart: string;
  dishes: REDayDishCandidates;
  addons: RESlotAddons;
  engineVersion: string;
}

export interface REFeedbackInput {
  userId: string;
  dishOptionId: string;
  mealClassCode: string;
  signal: REFeedbackSignal;
}

export interface MealPlanningREEngine {
  readonly engineVersion: string;
  generateWeeklyPlan(input: REGenerateWeeklyPlanInput): Promise<REWeeklyPlan | null>;
  getTodayView(input: RETodayViewInput): Promise<RETodayView>;
  recordFeedback(input: REFeedbackInput): Promise<void>;
}
