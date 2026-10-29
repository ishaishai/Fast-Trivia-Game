import { router } from 'expo-router';
import { View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, useAnimatedStyle, useDerivedValue, Extrapolation } from 'react-native-reanimated';
import { SESSIONS, localZone } from '@shared/schedule';
import { useBackend } from '@/backend/BackendProvider';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { dayLabel, num, ordinal, signed } from '@/lib/format';
import { featured, statusOf } from '@/lib/status';
import { useGame } from '@/stores/game';
import { usePreviewSheet } from '@/stores/ui';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';
import { FONTS } from '@/theme/typography';
import { WordsReveal } from '../motion/Kinetic';
import { Reveal, useScene } from '../motion/ScrollScene';
import { TOP_NAV_HEIGHT } from '../nav/TopNav';
import { playCurtain } from '../nav/TransitionOverlay';
import { DayRuler } from '../sky/DayRuler';
import { SkipBank } from '../sky/SkipBank';
import { SunDisc } from '../sky/SunDisc';
import { Container } from '../ui/Page';
import { LiveDot } from '../ui/bits';
import { Button } from '../ui/Button';
import { T } from '../ui/Text';

/**
 * The thesis of the page is the live competition: the score to beat right
 * now, who holds it, and the button that lets you take it.
 */
export function Hero() {
  const backend = useBackend();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const layout = useLayout();
  const light = useLight();
  const scene = useScene();
  const motion = useMotionOK();
  const openPreview = usePreviewSheet((s) => s.setOpen);
  const insets = useSafeAreaInsets();
  const c = day ? featured(day, now) : null;
  const board = useLeaderboard(c?.id, 3);

  const eclipse = useDerivedValue(() =>
    scene && motion ? interpolate(scene.scrollY.value, [0, layout.height * 0.9], [0.04, 0.94], Extrapolation.CLAMP) : 0.04,
  );
  const drift = useAnimatedStyle(() =>
    scene && motion ? { transform: [{ translateY: scene.scrollY.value * 0.32 }, { rotate: `${scene.scrollY.value * 0.01}deg` }] } : {},
  );

  if (!day || !c) return null;
  const st = statusOf(c, now, day);
  const title = SESSIONS[c.kind].title;
  const leader = board?.rows[0] ?? null;
  const me = board?.me ?? null;
  const myRank = board?.myRank ?? null;
  const total = board?.total ?? c.playersCount;
  const isDaily = c.kind === 'daily';
  const dayStart = localZone.toEpoch(day.dayKey, 0);

  const wide = !layout.isPhone;
  const sunSize = wide ? Math.min(layout.width * 0.46, 720) : layout.width * 0.66;
  const unclaimed = !leader;
  const bigText = st.running ? signed(day.played[c.id]?.score ?? 0) : unclaimed ? copy.hero.unclaimed : String(leader!.score);
  const heroStyle = { ...layout.type.hero, ...(unclaimed && !st.running ? { fontSize: (layout.type.xl.fontSize as number) * 1.15, lineHeight: (layout.type.xl.fontSize as number) * 1.05 } : null) };

  let line: string;
  if (st.running) line = copy.hero.resume;
  else if (unclaimed) line = copy.hero.firstRun;
  else if (me && leader && me.uid === leader.uid) line = copy.hero.youLead;
  else if (me && leader && myRank) {
    line = me.score === leader.score ? copy.hero.youTied : copy.hero.youBehind(leader.score - me.score, ordinal(myRank), num(total));
  } else line = `${copy.hero.heldBy(leader!.handle, leader!.city)} ${copy.hero.players(num(total), title)}`;

  const enter = (e: GestureResponderEvent) => playCurtain(e, light.sun, () => router.push(`/run/${c.id}`));

  return (
    <View
      style={{
        minHeight: wide ? Math.max(700, Math.min(layout.height, 1100)) : undefined,
        paddingTop: layout.topNav ? TOP_NAV_HEIGHT + insets.top + 24 : insets.top + 20,
        paddingBottom: 12,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            right: wide ? -sunSize * 0.22 : -sunSize * 0.34,
            top: wide ? TOP_NAV_HEIGHT + layout.height * 0.02 : insets.top - sunSize * 0.1,
          },
          drift,
        ]}
      >
        <SunDisc size={sunSize} color={light.sun} sky={light.field} glow={light.glow} eclipse={eclipse} />
        <View
          style={{
            position: 'absolute',
            left: sunSize / 2 - 1,
            top: -sunSize * 0.4,
            width: 2,
            height: sunSize * (wide ? 1.8 : 1.3),
            backgroundColor: light.ink,
            opacity: 0.55,
          }}
        />
      </Animated.View>

      <Container style={{ flex: 1, justifyContent: wide ? 'center' : 'flex-start', paddingTop: wide ? 0 : sunSize * 0.3 }}>
        <View style={{ maxWidth: wide ? layout.width * 0.56 : undefined, gap: wide ? 22 : 16 }}>
          <Reveal>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', maxWidth: wide ? undefined : layout.width * 0.52 }}>
              <T v="label">{dayLabel(now)}</T>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: light.sun }} />
              <T v="label">{title}</T>
              {st.phase === 'open' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <LiveDot size={7} />
                  <T v="label" color={light.sunText}>
                    {st.running ? 'Your run is live' : 'Live'}
                  </T>
                </View>
              ) : null}
            </View>
          </Reveal>

          <View style={{ flexDirection: wide && !unclaimed ? 'row' : 'column', alignItems: wide && !unclaimed ? 'flex-end' : 'flex-start', gap: wide ? 24 : 4, flexWrap: 'wrap' }}>
            <WordsReveal text={bigText} style={heroStyle} color={light.ink} delay={120} />
            {!unclaimed || st.running ? (
              <WordsReveal
                text={st.running ? 'and counting.' : copy.hero.toBeat}
                style={{ ...layout.type.xl, fontFamily: FONTS.light, marginBottom: wide ? (layout.type.hero.fontSize as number) * 0.06 : 0 }}
                color={light.ink}
                delay={360}
                accessibilityRole="text"
              />
            ) : null}
          </View>

          <Reveal delay={420}>
            <T v="bodyL" muted style={{ maxWidth: 560 }}>
              {line}
            </T>
          </Reveal>

          <Reveal delay={520}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              {st.running ? (
                <Button label="Back to your run" onPress={() => router.push(`/run/${c.id}`)} />
              ) : st.canEnter ? (
                <Button label={copy.day.enter(title)} onPress={enter} accessibilityHint="Starts your one run for this competition" />
              ) : st.mine ? (
                <>
                  <Button label={copy.day.standings} href={`/standings?c=${c.id}`} />
                  <Button label={copy.day.results} variant="ghost" href={`/results/${c.id}`} />
                </>
              ) : st.missed ? (
                <>
                  <Button label="Watch the standings" href={`/standings?c=${c.id}`} />
                  <T v="bodyS" muted style={{ maxWidth: 320 }}>
                    {copy.day.registrationClosed}
                  </T>
                </>
              ) : (
                <Button label={copy.day.standings} href={`/standings?c=${c.id}`} />
              )}
              {!st.running && isDaily ? <Button label="How scoring works" variant="ghost" href="/rules" /> : null}
            </View>
          </Reveal>

          <Reveal delay={600}>
            <View style={{ gap: 8 }}>
              <T v="label" muted>
                {copy.hero.skipsToday}
              </T>
              <SkipBank left={day.skipsLeft} />
            </View>
          </Reveal>
        </View>
      </Container>

      <Container style={{ marginTop: wide ? 32 : 36 }}>
        <Reveal delay={700}>
          <DayRuler competitions={day.competitions} now={now} dayStart={dayStart} />
        </Reveal>
        {backend.preview && wide ? (
          <Reveal delay={760}>
            <Button label="Preview: move the clock" variant="ghost" size="s" icon="arrow-right" onPress={() => openPreview(true)} style={{ marginTop: 10 }} />
          </Reveal>
        ) : null}
      </Container>
    </View>
  );
}
