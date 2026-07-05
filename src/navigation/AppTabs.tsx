import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LedgerScreen } from '../screens/LedgerScreen';
import { BuyersScreen } from '../screens/BuyersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type AppTabsParamList = {
  Dashboard: undefined;
  Ledger: undefined;
  Buyers: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

// Custom tab bar icon using text/emoji for now — swap with SVG icons later
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '⊡',
    Ledger: '☰',
    Buyers: '◉',
    Settings: '⚙',
  };
  return (
    <Text
      style={[
        styles.tabIcon,
        { color: focused ? Colors.primary : Colors.textMuted },
      ]}
    >
      {icons[label]}
    </Text>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Ledger" component={LedgerScreen} />
      <Tab.Screen name="Buyers" component={BuyersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.backgroundCard,
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
});
