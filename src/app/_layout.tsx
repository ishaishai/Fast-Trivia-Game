import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendProvider } from '@/backend/BackendProvider';
import { Mark } from '@/components/brand/Mark';
import { CursorHalo } from '@/components/nav/CursorHalo';
import { PreviewSheet } from '@/components/nav/PreviewSheet';
import { TransitionOverlay } from '@/components/nav/TransitionOverlay';
import { Gradient } from '@/components/ui/Gradient';
import { T } from '@/components/ui/Text';
import { Toasts } from '@/components/ui/Toasts';
import { useGame } from '@/stores/game';
import { FONT_ASSETS } from '@/theme/fonts';
import { LayoutProvider } from '@/theme/layout';
import { AmbientLight, useLight } from '@/theme/LightProvider';
import { SUNNY } from '@/theme/palette';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  return (
    <SafeAreaProvider>
      <LayoutProvider>
        <BackendProvider>
          <AmbientLight>
            <Shell fontsReady={fontsLoaded || Boolean(fontError)} />
          </AmbientLight>
        </BackendProvider>
      </LayoutProvider>
    </SafeAreaProvider>
  );
}

function Shell({ fontsReady }: { fontsReady: boolean }) {
  const ready = useGame((s) => s.ready);
  const error = useGame((s) => s.error);
  const hasProfile = useGame((s) => Boolean(s.profile));
  const segments = useSegments();
  const light = useLight();
  const booted = fontsReady && (ready || Boolean(error));

  // Everyone picks a name first; deep links come back to Today afterwards.
  useEffect(() => {
    if (booted && !error && !hasProfile && segments[0] !== 'welcome') router.replace('/welcome');
  }, [booted, error, hasProfile, segments]);

  useEffect(() => {
    if (booted) SplashScreen.hideAsync().catch(() => {});
  }, [booted]);

  if (!booted) {
    return (
      <Gradient colors={light.sky} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Mark size={96} sun={light.sun} line={SUNNY.face} />
      </Gradient>
    );
  }

  if (error) {
    return (
      <Gradient colors={light.sky} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <Mark size={80} sun={light.sun} line={SUNNY.face} />
        <T v="m" align="center">
          Meridian couldn’t start.
        </T>
        <T v="body" muted align="center" style={{ maxWidth: 460 }}>
          {error}
        </T>
      </Gradient>
    );
  }

  return (
    <>
      <StatusBar style={light.statusBar} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: light.field }, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="competition/[id]" options={{ animation: Platform.OS === 'web' ? 'fade' : 'default', title: 'Competition — Meridian' }} />
        <Stack.Screen name="results/[id]" options={{ animation: 'fade', title: 'Your run — Meridian' }} />
        <Stack.Screen name="rules" options={{ animation: Platform.OS === 'web' ? 'fade' : 'default', title: 'Rules — Meridian' }} />
        {/* On the web a modal renders as a small card; the run needs the whole window. */}
        <Stack.Screen
          name="run/[id]"
          options={{ presentation: Platform.OS === 'web' ? 'card' : 'fullScreenModal', gestureEnabled: false, animation: 'fade' }}
        />
      </Stack>
      <TransitionOverlay />
      <PreviewSheet />
      <CursorHalo />
      <Toasts />
    </>
  );
}
