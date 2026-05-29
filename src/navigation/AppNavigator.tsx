import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { EmailOtpVerifyScreen } from "../screens/auth/EmailOtpVerifyScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpVerifyScreen } from "../screens/auth/OtpVerifyScreen";
import { SignupEmailPasswordScreen } from "../screens/auth/SignupEmailPasswordScreen";
import { SignupEmailScreen } from "../screens/auth/SignupEmailScreen";
import { SignupPhonePasswordScreen } from "../screens/auth/SignupPhonePasswordScreen";
import { SignupPhoneScreen } from "../screens/auth/SignupPhoneScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { SplashScreen } from "../screens/auth/SplashScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { ForgotPasswordOtpScreen } from "../screens/auth/ForgotPasswordOtpScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { ChatScreen } from "../screens/chat/ChatScreen";
import { VoiceCallScreen } from "../screens/chat/VoiceCallScreen";
import { VideoCallScreen } from "../screens/chat/VideoCallScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { useAppStore } from "../store/appStore";
import { colors } from "../theme/colors";
import { AuthStackParamList, MainStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="SignupEmail" component={SignupEmailScreen} />
      <AuthStack.Screen
        name="EmailOtpVerify"
        component={EmailOtpVerifyScreen}
      />
      <AuthStack.Screen
        name="SignupEmailPassword"
        component={SignupEmailPasswordScreen}
      />
      <AuthStack.Screen name="SignupPhone" component={SignupPhoneScreen} />
      <AuthStack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <AuthStack.Screen
        name="SignupPhonePassword"
        component={SignupPhonePasswordScreen}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
      <AuthStack.Screen
        name="ForgotPasswordOtp"
        component={ForgotPasswordOtpScreen}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MainStack.Screen name="Home" component={HomeScreen} />
      <MainStack.Screen name="Chat" component={ChatScreen} />
      <MainStack.Screen name="Profile" component={ProfileScreen} />
      <MainStack.Screen 
        name="VoiceCall" 
        component={VoiceCallScreen} 
        options={{ presentation: 'fullScreenModal' }} 
      />
      <MainStack.Screen 
        name="VideoCall" 
        component={VideoCallScreen} 
        options={{ presentation: 'fullScreenModal' }} 
      />
    </MainStack.Navigator>
  );
}

export function AppNavigator() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const restoreSession = useAppStore((s) => s.restoreSession);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Restore session from storage
    restoreSession().then(() => {
      // Show splash for at least 1.4 seconds
      const timer = setTimeout(() => setShowSplash(false), 1400);
      return () => clearTimeout(timer);
    });
  }, [restoreSession]);

  if (showSplash) return <SplashScreen />;

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          text: colors.text,
          card: colors.background,
          border: "transparent",
          primary: colors.primary,
          notification: colors.danger,
        },
      }}
    >
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
