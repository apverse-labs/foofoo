// DOC-23 / BUILD-08: RE_V1 engine — cold-start, class-first, rule-based planning.
// Delegates to existing repositories; satisfies the MealPlanningREEngine interface.

import { generateUserWeeklyPlan, fetchUserWeeklyPlan, dayNameFromDateIST } from '../../../repositories/re-plan.repository';
import { fetchTodayAddons } from '../../../repositories/re-addon.repository';
import { fetchTodayDishCandidates } from '../../../repositories/re-dish-expander.repository';
import { recordFeedback as repoRecordFeedback } from '../../../repositories/re-feedback.repository';
import type {
  MealPlanningREEngine,
  REFeedbackInput,
  REGenerateWeeklyPlanInput,
  RETodayView,
  RETodayViewInput,
} from '../../interface/MealPlanningREEngine';
import type { REWeeklyPlan } from '../../../types';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

function todayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

export class REV1Engine implements MealPlanningREEngine {
  readonly engineVersion = 'classfirst_v1';

  async generateWeeklyPlan({ userId, forceRegenerate = false }: REGenerateWeeklyPlanInput): Promise<REWeeklyPlan | null> {
    if (forceRegenerate) {
      await generateUserWeeklyPlan(userId);
    }
    return fetchUserWeeklyPlan(userId);
  }

  async getTodayView({ userId, date }: RETodayViewInput): Promise<RETodayView> {
    const [plan, addonData, dishData] = await Promise.all([
      fetchUserWeeklyPlan(userId),
      fetchTodayAddons(userId, date),
      fetchTodayDishCandidates(userId, date),
    ]);

    const name = date ? dayNameFromDateIST(date) : todayName();
    const dayPlan = plan?.days.find((d) => d.dayOfWeek === name) ?? plan?.days[0] ?? null;

    return {
      dayPlan,
      weekStart: plan?.planWeekStart ?? '',
      dishes: dishData,
      addons: addonData,
      engineVersion: this.engineVersion,
    };
  }

  async recordFeedback({ userId, dishOptionId, mealClassCode, signal }: REFeedbackInput): Promise<void> {
    await repoRecordFeedback(userId, dishOptionId, mealClassCode, signal);
  }
}
