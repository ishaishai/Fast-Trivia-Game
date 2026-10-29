import Head from 'expo-router/head';
import { View } from 'react-native';
import { KINDS, SESSIONS } from '@shared/schedule';
import { Icon, type IconName } from '@/components/icons';
import { PopIn } from '@/components/motion/Playful';
import { SessionTile } from '@/components/sky/SessionTile';
import { TryOne } from '@/components/today/TryOne';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclosure } from '@/components/ui/Disclosure';
import { Container, Page } from '@/components/ui/Page';
import { Chip } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { clockTime } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { FONTS } from '@/theme/typography';

const RULES: { n: string; text: string; icon: IconName; bg: string; lip: string }[] = [
  { n: '60s', text: 'A game lasts 60 seconds. The clock only runs while a question is showing.', icon: 'clock', bg: '#4FB8FF', lip: '#2A7FC4' },
  { n: '3s', text: 'You get 3 seconds for each question.', icon: 'bolt', bg: '#FFC83D', lip: '#B87800' },
  { n: '+3', text: 'For every right answer.', icon: 'check', bg: '#2BD46A', lip: '#14974A' },
  { n: '−1', text: 'For a wrong answer, or no answer in time.', icon: 'cross', bg: '#FF5A5F', lip: '#C8323A' },
  { n: '24', text: 'Skips a day. A skip costs nothing.', icon: 'skip', bg: '#B08CFF', lip: '#7A55D6' },
  { n: '1', text: 'Go at each game. Everyone gets the same questions in the same order.', icon: 'star', bg: '#FF8FB8', lip: '#D45A88' },
];

const FAQ: [string, string][] = [
  ['Why can’t I play it again?', 'Because nobody else can either. One go each keeps the crown fair.'],
  ['What if I close the app in the middle?', 'The clock keeps running. Come back quickly and you carry on where you left off.'],
  ['Do skips carry over?', 'No. You get 24 a day, shared by every game. They refill at midnight.'],
  ['Does a slow connection cost me time?', 'No. The clock only counts while a question is on screen, and the time between questions is set aside for the network.'],
  ['Why “Meridian”?', 'A meridian is the line the sun crosses at its highest point. Every day, somebody gets there first.'],
];

export default function Rules() {
  const layout = useLayout();
  const day = useGame((s) => s.day);
  const columns = layout.width >= 700 ? 3 : 2;
  return (
    <Page nav>
      <Head>
        <title>How to play — Meridian</title>
      </Head>
      <Container style={{ gap: 16, maxWidth: 820 }}>
        <PopIn>
          <T v="xl" accessibilityRole="header">
            How to play
          </T>
        </PopIn>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {RULES.map((r, i) => (
            <PopIn key={r.n} index={i + 1} style={{ width: `${100 / columns - 3}%`, flexGrow: 1 }}>
              <Card pad={16} shadow="flat" contentStyle={{ gap: 10, minHeight: 150 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: r.bg, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 3px 0px 0px ${r.lip}` }}>
                    <Icon name={r.icon} color="#221B45" size={21} strokeWidth={2.8} filled={r.icon === 'bolt' || r.icon === 'star'} />
                  </View>
                  <T v="l" style={{ fontFamily: FONTS.display }}>
                    {r.n}
                  </T>
                </View>
                <T v="body">{r.text}</T>
              </Card>
            </PopIn>
          ))}
        </View>

        <PopIn index={7}>
          <Card contentStyle={{ gap: 12 }}>
            <T v="m" accessibilityRole="header">
              The games
            </T>
            <T v="body" muted>
              The Daily is open all day. The other three last an hour; save your spot any time in the 24 hours before they start.
            </T>
            {(day?.competitions ?? []).map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SessionTile kind={c.kind} size={44} />
                <View style={{ flex: 1 }}>
                  <T v="title">{SESSIONS[c.kind].title}</T>
                  <T v="label" muted>
                    {c.kind === 'daily' ? 'All day' : `${clockTime(c.opensAt)} – ${clockTime(c.closesAt)}`}
                  </T>
                </View>
                <Chip tone={SESSIONS[c.kind].registration ? 'sun' : 'good'}>{SESSIONS[c.kind].registration ? 'Sign up first' : 'Just play'}</Chip>
              </View>
            ))}
            {!day
              ? KINDS.map((k) => (
                  <T key={k} v="title">
                    {SESSIONS[k].title}
                  </T>
                ))
              : null}
          </Card>
        </PopIn>

        <PopIn index={8}>
          <Card contentStyle={{ gap: 14 }}>
            <T v="m" accessibilityRole="header">
              {copy.rules.tryTitle}
            </T>
            <TryOne />
            <Button label="Practice a full game" variant="ink" iconLeft="play" href="/run/practice" />
          </Card>
        </PopIn>

        <PopIn index={9} style={{ gap: 10 }}>
          <T v="s" accessibilityRole="header">
            Questions, answered
          </T>
          <Disclosure title="Who wins when it’s a tie?">
            <Card pad={16}>
              <T v="body">{copy.rules.tieBreak}</T>
            </Card>
          </Disclosure>
          {FAQ.map(([q, a]) => (
            <Disclosure key={q} title={q}>
              <Card pad={16}>
                <T v="body">{a}</T>
              </Card>
            </Disclosure>
          ))}
        </PopIn>
      </Container>
    </Page>
  );
}
