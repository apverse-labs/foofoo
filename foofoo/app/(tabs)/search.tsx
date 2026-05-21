import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/config/constants';

export default function SearchTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search — coming in Sprint 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  text: { fontSize: 16, color: COLORS.textSecondary },
});
