import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Context Providers
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
import LoginScreen from './screens/LoginScreen';
import AdminDashboard from './screens/AdminDashboard';
import StudentDashboard from './screens/StudentDashboard';
import SeatManagement from './screens/SeatManagement';
import FeeManagement from './screens/FeeManagement';
import AddStudent from './screens/AddStudent';
import NoticeBoard from './screens/NoticeBoard';
import Complaints from './screens/Complaints';
import Leaderboard from './screens/Leaderboard';
import Rules from './screens/Rules';
import Settings from './screens/Settings';
import AdminSettings from './screens/AdminSettings';
import Reports from './screens/Reports';
import MyFees from './screens/MyFees';
import MyAttendance from './screens/MyAttendance';

// Initialize data
import { initializeData } from './lib/storage';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function NavigationStack() {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : role === 'admin' ? (
        <>
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="SeatManagement" component={SeatManagement} />
          <Stack.Screen name="FeeManagement" component={FeeManagement} />
          <Stack.Screen name="AddStudent" component={AddStudent} />
          <Stack.Screen name="NoticeBoard" component={NoticeBoard} />
          <Stack.Screen name="Complaints" component={Complaints} />
          <Stack.Screen name="Reports" component={Reports} />
          <Stack.Screen name="AdminSettings" component={AdminSettings} />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="Leaderboard" component={Leaderboard} />
          <Stack.Screen name="Rules" component={Rules} />
        </>
      ) : (
        <>
          <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
          <Stack.Screen name="MyFees" component={MyFees} />
          <Stack.Screen name="MyAttendance" component={MyAttendance} />
          <Stack.Screen name="NoticeBoard" component={NoticeBoard} />
          <Stack.Screen name="Complaints" component={Complaints} />
          <Stack.Screen name="Leaderboard" component={Leaderboard} />
          <Stack.Screen name="Rules" component={Rules} />
          <Stack.Screen name="Settings" component={Settings} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeData().then(() => setIsInitializing(false));
  }, []);

  if (!fontsLoaded || isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <NavigationStack />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
