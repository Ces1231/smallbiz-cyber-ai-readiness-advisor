import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AssessmentFormScreen } from '../screens/AssessmentFormScreen';
import { FreeScoreScreen } from '../screens/FreeScoreScreen';
import { UpgradeScreen } from '../screens/UpgradeScreen';
import { ActionPlanScreen } from '../screens/ActionPlanScreen';
import { AssessmentDetailScreen } from '../screens/AssessmentDetailScreen';

// Tab navigator param list
export type AppTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

// Root app stack param list (wraps tabs + modal/detail screens)
export type AppStackParamList = {
  Tabs: undefined;
  AssessmentForm: undefined;
  FreeScore: { assessmentId: string; assessment: any };
  Upgrade: undefined;
  ActionPlan: { assessmentId: string };
  AssessmentDetail: { id: string };
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Home: '⌂', History: '☰', Profile: '◉' };
  return (
    <Text style={{ fontSize: 20, color: focused ? colors.cyan : colors.muted }}>
      {icons[label] ?? '•'}
    </Text>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="AssessmentForm" component={AssessmentFormScreen} />
      <Stack.Screen name="FreeScore" component={FreeScoreScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} />
      <Stack.Screen name="ActionPlan" component={ActionPlanScreen} />
      <Stack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
    </Stack.Navigator>
  );
}
