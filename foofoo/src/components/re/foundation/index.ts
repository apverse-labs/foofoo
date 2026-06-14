/**
 * RE UI foundation barrel (UI-BUILD-01).
 * Reusable, presentational, accessible primitives for all RE screens.
 * No data, no API, no RE logic.
 */
export { default as RECard } from './RECard';
export { default as REChip } from './REChip';
export { default as REButton } from './REButton';
export { default as REBottomSheet } from './REBottomSheet';
export { default as RESkeleton } from './RESkeleton';
export { default as REEmptyState } from './REEmptyState';
export { default as REErrorState } from './REErrorState';
export { default as RETracePanel } from './RETracePanel';
export { useReducedMotion } from './useReducedMotion';

export type { RECardProps } from './RECard';
export type { REChipProps, ChipVariant } from './REChip';
export type { REButtonProps, ButtonVariant } from './REButton';
export type { REBottomSheetProps } from './REBottomSheet';
export type { RESkeletonProps } from './RESkeleton';
export type { REEmptyStateProps } from './REEmptyState';
export type { REErrorStateProps } from './REErrorState';
export type { RETracePanelProps } from './RETracePanel';
