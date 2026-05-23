import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { COLORS } from '../../src/config/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Planner',
          tabBarLabel: 'Planner',
          tabBarAccessibilityLabel: 'Meal Planner tab',
          tabBarIcon: ({ color }) => <TabIcon label="🗓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          tabBarLabel: 'Grocery',
          tabBarAccessibilityLabel: 'Grocery List tab',
          tabBarIcon: ({ color }) => <TabIcon label="🛒" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarAccessibilityLabel: 'Search Dishes tab',
          tabBarIcon: ({ color }) => <TabIcon label="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile and Settings tab',
          tabBarIcon: ({ color }) => <TabIcon label="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: ColorValue }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === COLORS.primary ? 1 : 0.5 }}>{label}</Text>;
}
