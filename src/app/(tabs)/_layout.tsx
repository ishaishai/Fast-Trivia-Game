import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, TabBarSpaceProvider, tabBarSpace } from '@/components/nav/TabBar';
import { TopNav } from '@/components/nav/TopNav';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';

export default function TabsLayout() {
  const profile = useGame((s) => s.profile);
  const { topNav } = useLayout();
  const light = useLight();
  const insets = useSafeAreaInsets();
  if (!profile) return <Redirect href="/welcome" />;
  return (
    <TabBarSpaceProvider value={topNav ? 0 : tabBarSpace(insets.bottom)}>
      <View style={{ flex: 1, backgroundColor: light.field }}>
        <Tabs
          backBehavior="history"
          tabBar={() => null}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: light.field } }}
        >
          <Tabs.Screen name="index" options={{ title: 'Glint! — Play' }} />
          <Tabs.Screen name="standings" options={{ title: 'Ranks — Glint!' }} />
          <Tabs.Screen name="you" options={{ title: 'Me — Glint!' }} />
        </Tabs>
        {topNav ? <TopNav /> : <TabBar />}
      </View>
    </TabBarSpaceProvider>
  );
}
