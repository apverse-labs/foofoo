import { View, Text, StyleSheet } from 'react-native';
import { COLORS, APP_NAME } from '../../src/config/constants';

/**
 * @summary Home tab — meal planner (Sprint 2+).
 *
 * @description Placeholder until the Recommendation Engine and daily plan
 * screens are built in Sprint 2. Routes here after successful sign-in when
 * onboarding_completed = true.
 */
export default function HomeTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_NAME}</Text>
      <Text style={styles.label}>Home — coming in Sprint 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  label: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
