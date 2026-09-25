import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { RealtimeProvider } from './src/contexts/RealtimeContext';
import { RealtimeAlertBanner } from './src/components/RealtimeAlertBanner';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DashboardScreen } from './src/screens/concierge/DashboardScreen';

const AnimatedLoadingScreen: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.75,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.loadingContainer}>
      <Animated.Image
        source={require('./assets/logo.png')}
        style={[
          styles.loadingLogo,
          {
            opacity: pulseAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
        resizeMode="contain"
      />
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    </View>
  );
};

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AnimatedLoadingScreen />;
  }

  return user ? <DashboardScreen /> : <LoginScreen />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RealtimeProvider>
          <StatusBar style="light" />
          <MainNavigator />
          <RealtimeAlertBanner />
        </RealtimeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F203D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 220,
    height: 110,
  },
  spinnerContainer: {
    marginTop: 28,
  },
});
