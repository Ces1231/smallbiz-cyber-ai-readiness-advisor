import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';

// Lazy imports to avoid circular deps at shell stage
const StageGateScreen = React.lazy(() =>
  import('../screens/StageGateScreen').then((m) => ({ default: m.StageGateScreen }))
);
const LoginScreen = React.lazy(() =>
  import('../screens/auth/LoginScreen').then((m) => ({ default: m.LoginScreen }))
);
const SignupScreen = React.lazy(() =>
  import('../screens/auth/SignupScreen').then((m) => ({ default: m.SignupScreen }))
);

export type AuthStackParamList = {
  StageGate: undefined;
  Login: { isStartup?: boolean };
  Signup: { isStartup?: boolean };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="StageGate"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: '',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="StageGate"
        component={StageGateScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreenWrapper}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreenWrapper}
        options={{ title: 'Create Account' }}
      />
    </Stack.Navigator>
  );
}

// Wrapper components to avoid Suspense issues with createNativeStackNavigator
import { StageGateScreen as SGS } from '../screens/StageGateScreen';
import { LoginScreen as LS } from '../screens/auth/LoginScreen';
import { SignupScreen as SS } from '../screens/auth/SignupScreen';
function StageGateScreenWrapper(props: any) { return <SGS {...props} />; }
function LoginScreenWrapper(props: any) { return <LS {...props} />; }
function SignupScreenWrapper(props: any) { return <SS {...props} />; }
