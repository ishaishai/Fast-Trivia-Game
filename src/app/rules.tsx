import Head from 'expo-router/head';
import { View } from 'react-native';
import { KINDS, SESSIONS } from '@shared/schedule';
import { WordsReveal } from '@/components/motion/Kinetic';
import { Reveal, Section } from '@/components/motion/ScrollScene';
import { TryOne } from '@/components/today/TryOne';
import { Button } from '@/components/ui/Button';
import { Container, Page } from '@/components/ui/Page';
import { Eyebrow, Hairline } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { useNow } from '@/hooks/useNow';
import { clockTime } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { FONTS } from '@/theme/typography';

const FAQ: [string, string][] = [
  ['Why can’t I run it again?', 'Because nobody else can either. One run per competition keeps the crown honest.'],
  [
    'What if I close the app mid-run?',
    'The clock keeps running on the server. Come back quickly and you pick up where you left off — though the question on screen may already have eclipsed.',
  ],
  ['Do skips carry over?', 'No. You get 24 a day, shared across every competition you enter. They refill at midnight.'],
  ['Does a slow connection cost me time?', 'No. The run clock only counts while a question is on screen, and the time between questions is set aside for the network.'],
  ['Is everyone really answering the same questions?', 'Yes: the same 80-question deck, in the same order, with the answers in the same order, for every player in a competition.'],
  ['Why “Meridian”?', 'A meridian is the line the sun crosses at its highest point. Every day, somebody gets there first.'],
];

export default function Rules() {
  const layout = useLayout();
  const light = useLight();
  const day = useGame((s) => s.day);
  const now = useNow(60_000);
  const wide = !layout.isPhone;
  return (
    <Page nav>
      <Head>
        <title>How Meridian works</title>
      </Head>
      <Section>
        <Container style={{ gap: 22 }}>
          <Reveal>
            <Eyebrow>{copy.rules.eyebrow}</Eyebrow>
          </Reveal>
          <WordsReveal text="How to win the day." style={layout.type.hero} color={light.ink} containerStyle={{ maxWidth: 1100 }} />
          <Reveal delay={200}>
            <T v="bodyL" muted style={{ maxWidth: 640 }}>
              Meridian is a trivia championship that resets every midnight. Each competition gives you one run: sixty seconds of answering, three seconds a question.
            </T>
          </Reveal>
        </Container>
      </Section>

      <Section style={{ paddingTop: layout.isPhone ? 40 : 72 }}>
        <Container>
          {copy.rules.numbers.map((item, i) => (
            <Reveal key={item.n} delay={i * 50}>
              <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 40 : 6, paddingVertical: wide ? 22 : 16, borderTopWidth: 1, borderTopColor: light.line }}>
                <T v="xl" style={{ width: wide ? 240 : undefined, fontFamily: FONTS.black }} color={i === 2 ? light.sunText : light.ink}>
                  {item.n}
                </T>
                <T v="bodyL" style={{ flex: wide ? 1 : undefined, maxWidth: 620, paddingTop: wide ? 14 : 0 }}>
                  {item.text}
                </T>
              </View>
            </Reveal>
          ))}
        </Container>
      </Section>

      <Section style={{ paddingTop: layout.isPhone ? 48 : 88 }}>
        <Container style={{ gap: 20 }}>
          <T v="l">The schedule</T>
          <T v="body" muted style={{ maxWidth: 620 }}>
            The Daily is open to everyone, all day. The three sessions need registration, which opens 24 hours before their doors and closes when they open. Register for any or all of them — each one is its own competition with its own crown. Times are shown in your time zone.
          </T>
          <View style={{ gap: 0 }}>
            {(day?.competitions ?? []).map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: light.line }}>
                <T v="m" style={{ width: wide ? 200 : 110, fontFamily: FONTS.thin }}>
                  {c.kind === 'daily' ? 'All day' : `${clockTime(c.opensAt)}–${clockTime(c.closesAt)}`}
                </T>
                <View style={{ flex: 1 }}>
                  <T v="title">{SESSIONS[c.kind].title}</T>
                  <T v="bodyS" muted>
                    {SESSIONS[c.kind].eyebrow} · {SESSIONS[c.kind].registration ? 'Registration required' : 'No registration'}
                  </T>
                </View>
              </View>
            ))}
            {!day
              ? KINDS.map((k) => (
                  <T key={k} v="title">
                    {SESSIONS[k].title}
                  </T>
                ))
              : null}
          </View>
          <T v="label" muted>
            Now: {clockTime(now)}
          </T>
        </Container>
      </Section>

      <Section style={{ paddingTop: layout.isPhone ? 48 : 88 }}>
        <Container style={{ gap: 18 }}>
          <T v="l">Scoring and ties</T>
          <T v="bodyL" style={{ maxWidth: 680 }}>
            Right answers are worth +3. Wrong answers cost 1. If the eclipse closes before you answer, that’s silence, and silence costs 1 too — so the only free pass is a skip.
          </T>
          <T v="bodyL" muted style={{ maxWidth: 680 }}>
            {copy.rules.tieBreak}
          </T>
        </Container>
      </Section>

      <Section style={{ paddingTop: layout.isPhone ? 48 : 88 }}>
        <Container style={{ gap: 16 }}>
          <T v="l">{copy.rules.tryTitle}</T>
          <TryOne />
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <Button label="Practice a full run" icon="play" href="/run/practice" />
            <Button label="Back to today" variant="ghost" href="/" />
          </View>
        </Container>
      </Section>

      <Section style={{ paddingTop: layout.isPhone ? 48 : 88, paddingBottom: 40 }}>
        <Container style={{ gap: 10 }}>
          <T v="l" style={{ marginBottom: 8 }}>
            Questions, answered
          </T>
          {FAQ.map(([q, a]) => (
            <View key={q} style={{ gap: 6, paddingVertical: 16 }}>
              <Hairline />
              <T v="title" accessibilityRole="header" style={{ marginTop: 12 }}>
                {q}
              </T>
              <T v="body" muted style={{ maxWidth: 680 }}>
                {a}
              </T>
            </View>
          ))}
        </Container>
      </Section>
    </Page>
  );
}
