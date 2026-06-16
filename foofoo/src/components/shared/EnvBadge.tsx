import { Text, View, StyleSheet } from 'react-native';
import { SUPABASE_URL } from '../../config/constants';

const PROD_SUPABASE_REF = 'ufgfznpqixplcbhmsqqw';

// Visible only on non-production Supabase targets, so anyone testing can
// see at a glance which DB a build is talking to.
export function EnvBadge() {
  if (!SUPABASE_URL || SUPABASE_URL.includes(PROD_SUPABASE_REF)) return null;

  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>STAGING</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF8F00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 9999,
  },
  text: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
