import { StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../config/constants';

// Drag-direction tint colours — must match COLORS.never / COLORS.warning so the
// preview matches the destructive Never modal and the amber Not Today modal.

// Doc 09 §5.1: 200px height, 24px side margins, 20–24px corner radius.
// Width is applied at render time from useResponsive() — see MealCard.tsx.
export const CARD_HEIGHT = 200;
export const CARD_RADIUS = BORDER_RADIUS.lg; // 24

export const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: COLORS.textPrimary, // #1A1A1A — shows behind image during load
  },
  cardLocked: {
    borderWidth: 2,
    borderColor: COLORS.locked,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: CARD_RADIUS,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
    borderRadius: CARD_RADIUS,
  },
  slotLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  positionLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 88,
  },
  dishName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    // Gradient overlay (see styles.gradient) already provides legibility; no
    // per-text shadow needed. RN dropped textShadow* in favour of the
    // single `textShadow` shorthand and the old keys now warn.
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    color: '#fff',
    fontSize: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  actions: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  skeleton: {
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  tintOverlayNever: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.never,
    borderRadius: CARD_RADIUS,
  },
  tintOverlayNotToday: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.warning,
    borderRadius: CARD_RADIUS,
  },
});
