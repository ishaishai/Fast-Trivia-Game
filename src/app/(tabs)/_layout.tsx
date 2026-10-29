import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { TabBar } from '@/components/nav/TabBar';
import { TopNav } from '@/components/nav/TopNav';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';

export default function TabsLayout() {
  const profile = useGame((s) => s.profile);
  const { topNav } = useLayout();
  const light = useLight();
  if (!profile) return <Redirect href="/welcome" />;
  return (
    <View style={{ flex: 1, backgroundColor: light.field }}>
      <Tabs
        backBehavior="history"
        tabBar={(props) => (topNav ? null : <TabBar {...props} />)}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: light.field } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Meridian — Today' }} />
        <Tabs.Screen name="standings" options={{ title: 'Standings — Meridian' }} />
        <Tabs.Screen name="champions" options={{ title: 'Hall of Crowns — Meridian' }} />
        <Tabs.Screen name="you" options={{ title: 'You — Meridian' }} />
      </Tabs>
      {topNav ? <TopNav /> : null}
    </View>
  );
}
