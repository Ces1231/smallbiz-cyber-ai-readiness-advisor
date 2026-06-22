import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { OnboardingGateScreen } from '../screens/onboarding/OnboardingGateScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const ONBOARDING_KEY = 'onboardingComplete';

export function RootNavigator() {
  const { isLoggedIn, onboardingComplete, initialize, setOnboardingComplete } = useAuthStore();

  useEffect(() => {
    async function boot() {
      await initialize();
      const val = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingComplete(val === 'true');
    }
    boot();
  }, []);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.cyan,
          background: colors.background,
          card: colors.panel,
          text: colors.text,
          border: colors.border,
          notification: colors.red,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          onboardingComplete ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            <Stack.Screen name="OnboardingGate" component={OnboardingGateScreen as any} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
