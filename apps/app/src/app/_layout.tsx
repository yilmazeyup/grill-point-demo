import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Intro } from '../components/Intro';
import { ToastProvider } from '../components/Toast';
import { installLocale } from '../i18n';
import { clockNow, DemoProvider, useDemo } from '../state/demo';
import { installTheme, ThemeProvider, useTheme } from '../state/theme';
import { C } from '../theme';
import { installWebStyles } from '../web/css';

installLocale();
installWebStyles();
installTheme(clockNow().now);
SplashScreen.preventAutoHideAsync().catch(() => {});

function Themed({ children }: PropsWithChildren) {
  const { now } = useDemo();
  return <ThemeProvider now={now}>{children}</ThemeProvider>;
}

function Bar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'night' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  // The opening plays each time the app starts; on the web ?intro=0 skips it (for screenshots and deep links).
  const [intro, setIntro] = useState(() => !(Platform.OS === 'web' && new URLSearchParams(globalThis.location?.search ?? '').get('intro') === '0'));
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <SafeAreaProvider>
      <DemoProvider>
        <Themed>
          <ToastProvider>
            <View style={{ flex: 1, backgroundColor: C.bg }}>
              <Bar />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="gerecht/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="mandje" options={{ animation: 'slide_from_bottom' }} />
              </Stack>
              {intro ? <Intro onDone={() => setIntro(false)} /> : null}
            </View>
          </ToastProvider>
        </Themed>
      </DemoProvider>
    </SafeAreaProvider>
  );
}
