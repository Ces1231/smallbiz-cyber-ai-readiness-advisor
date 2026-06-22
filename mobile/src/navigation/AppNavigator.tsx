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
// Startup path screens
import { StartupStep1Screen } from '../screens/startup/StartupStep1Screen';
import { StartupStep2Screen } from '../screens/startup/StartupStep2Screen';
import { StartupStep3Screen } from '../screens/startup/StartupStep3Screen';
import { StartupStep4Screen } from '../screens/startup/StartupStep4Screen';
import { StartupStep5Screen } from '../screens/startup/StartupStep5Screen';
import { StartupStep6Screen } from '../screens/startup/StartupStep6Screen';
import { StartupStep7Screen } from '../screens/startup/StartupStep7Screen';
import { StartupStep8Screen } from '../screens/startup/StartupStep8Screen';
import { StartupStep9Screen } from '../screens/startup/StartupStep9Screen';
import { StartupScoreScreen } from '../screens/startup/StartupScoreScreen';
import { StartupLaunchPlanScreen } from '../screens/startup/StartupLaunchPlanScreen';
import { ChampInfoScreen } from '../screens/ChampInfoScreen';
// Dream Builder path
import { DreamBuilderQuizScreen } from '../screens/dream/DreamBuilderQuizScreen';
import { DreamBuilderResultsScreen } from '../screens/dream/DreamBuilderResultsScreen';
import { DreamBuilderPlanScreen } from '../screens/dream/DreamBuilderPlanScreen';
import { DreamBuilderUpgradeScreen } from '../screens/dream/DreamBuilderUpgradeScreen';

// Tab navigator param list
export type AppTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

// Root app stack param list (wraps tabs + modal/detail screens)
export type AppStackParamList = {
  Tabs: undefined;
  // Existing business path
  AssessmentForm: undefined;
  FreeScore: { assessmentId: string; assessment: any };
  Upgrade: undefined;
  ActionPlan: { assessmentId: string };
  AssessmentDetail: { id: string };
  // Champtron info
  ChampInfo: undefined;
  // Startup path
  StartupStep1: undefined;
  StartupStep2: undefined;
  StartupStep3: undefined;
  StartupStep4: undefined;
  StartupStep5: undefined;
  StartupStep6: undefined;
  StartupStep7: undefined;
  StartupStep8: undefined;
  StartupStep9: undefined;
  StartupScore: { assessment: any };
  StartupLaunchPlan: { assessment: any };
  // Dream Builder path
  DreamBuilderQuiz: undefined;
  DreamBuilderResults: {
    businessIdeaId: string;
    suggestions: any[];
    missionPreview: string;
  };
  DreamBuilderPlan: {
    businessIdeaId: string;
    savedIdea: any;
    tier: string;
  };
  DreamBuilderUpgrade: {
    businessIdeaId: string;
    productKey: string;
    savedIdea?: any;
  };
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
      {/* Existing business path */}
      <Stack.Screen name="AssessmentForm" component={AssessmentFormScreen} />
      <Stack.Screen name="FreeScore" component={FreeScoreScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} />
      <Stack.Screen name="ActionPlan" component={ActionPlanScreen} />
      <Stack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
      {/* Champtron info */}
      <Stack.Screen name="ChampInfo" component={ChampInfoScreen} />
      {/* Startup path */}
      <Stack.Screen name="StartupStep1" component={StartupStep1Screen} />
      <Stack.Screen name="StartupStep2" component={StartupStep2Screen} />
      <Stack.Screen name="StartupStep3" component={StartupStep3Screen} />
      <Stack.Screen name="StartupStep4" component={StartupStep4Screen} />
      <Stack.Screen name="StartupStep5" component={StartupStep5Screen} />
      <Stack.Screen name="StartupStep6" component={StartupStep6Screen} />
      <Stack.Screen name="StartupStep7" component={StartupStep7Screen} />
      <Stack.Screen name="StartupStep8" component={StartupStep8Screen} />
      <Stack.Screen name="StartupStep9" component={StartupStep9Screen} />
      <Stack.Screen name="StartupScore" component={StartupScoreScreen} />
      <Stack.Screen name="StartupLaunchPlan" component={StartupLaunchPlanScreen} />
      {/* Dream Builder path */}
      <Stack.Screen name="DreamBuilderQuiz" component={DreamBuilderQuizScreen} />
      <Stack.Screen name="DreamBuilderResults" component={DreamBuilderResultsScreen} />
      <Stack.Screen name="DreamBuilderPlan" component={DreamBuilderPlanScreen} />
      <Stack.Screen name="DreamBuilderUpgrade" component={DreamBuilderUpgradeScreen} />
    </Stack.Navigator>
  );
}
