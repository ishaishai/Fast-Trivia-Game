import Head from 'expo-router/head';
import { View } from 'react-native';
import { PopIn } from '@/components/motion/Playful';
import { HowToCard } from '@/components/today/HowToCard';
import { PlayCard } from '@/components/today/PlayCard';
import { SessionCard } from '@/components/today/SessionCard';
import { Container, Page } from '@/components/ui/Page';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { useNow } from '@/hooks/useNow';
import { sessionSlots } from '@/lib/status';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useAmbientLight } from '@/theme/LightProvider';

/** Play: today's game front and centre, the three sessions under it, and how to play. */
export default function Play() {
  const day = useGame((s) => s.day);
  const handle = useGame((s) => s.profile?.handle ?? '');
  const now = useNow(15_000);
  const ambient = useAmbientLight();
  const layout = useLayout();
  const wide = layout.width >= 900;
  const slots = day ? sessionSlots(day, now) : [];

  const sessions = (
    <View style={{ gap: 12 }}>
      <PopIn index={2}>
        <T v="s" accessibilityRole="header" style={{ marginTop: wide ? 0 : 10 }}>
          {copy.play.more}
        </T>
      </PopIn>
      {slots.map((slot, i) => (
        <PopIn key={slot.competition.kind} index={3 + i}>
          <SessionCard slot={slot} />
        </PopIn>
      ))}
    </View>
  );

  return (
    <Page>
      <Head>
        <title>{copy.meta.title}</title>
        <meta name="description" content={copy.meta.description} />
      </Head>
      <Container style={{ maxWidth: 1120 + layout.gutter * 2, gap: 18 }}>
        <PopIn>
          <View style={{ gap: 2 }}>
            <T v="xl" accessibilityRole="header" fit={0.6}>
              {copy.play.greeting[ambient]}
            </T>
            {handle ? (
              <T v="title" muted>
                {copy.play.you(handle)}
              </T>
            ) : null}
          </View>
        </PopIn>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 28 : 18, alignItems: 'flex-start' }}>
          <View style={{ flex: wide ? 1.1 : undefined, alignSelf: 'stretch' }}>
            <PopIn index={1} from={0.8}>
              <PlayCard />
            </PopIn>
          </View>
          <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 18 }}>
            {sessions}
            <PopIn index={6}>
              <HowToCard />
            </PopIn>
          </View>
        </View>
      </Container>
    </Page>
  );
}
