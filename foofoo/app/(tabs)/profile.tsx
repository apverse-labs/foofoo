import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../../src/config/constants';
import { supabase } from '../../src/services/supabase';

export default function ProfileTab() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile — coming in Sprint 5</Text>
      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: SPACING.lg },
  text: { fontSize: 16, color: COLORS.textSecondary },
  signOut: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.xl, paddingVertical: 10,
  },
  signOutText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});
