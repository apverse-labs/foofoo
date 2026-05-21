import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../config/constants';

export const CARD_HEIGHT = 220;
export const SCREEN_WIDTH = Dimensions.get('window').width;

export const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#1a1a1a',
  },
  cardLocked: {
    borderWidth: 2,
    borderColor: COLORS.locked,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.md,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
    borderRadius: BORDER_RADIUS.md,
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    width: SCREEN_WIDTH - 32,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonLabel: {
    color: '#9e9e9e',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
});
