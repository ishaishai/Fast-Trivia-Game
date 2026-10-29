import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { isGameError } from '@shared/errors';
import { SESSIONS, localZone } from '@shared/schedule';
import type { Competition } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { LightWindow } from '../sky/LightWindow';
import { copy } from '@/copy/en';
import { useNow } from '@/hooks/useNow';
import { clockTime, countdown, num, signed } from '@/lib/format';
import { lightOf, statusOf } from '@/lib/status';
import { useGame } from '@/stores/game';
import { usePreviewSheet } from '@/stores/ui';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';
import { LIGHTS } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { WordsReveal } from '../motion/Kinetic';
import { Reveal, Section, useScene, useSection } from '../motion/ScrollScene';
import { playCurtain } from '../nav/TransitionOverlay';
import { Button } from '../ui/Button';
import { Container } from '../ui/Page';
import { Eyebrow, LiveDot } from '../ui/bits';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';
import { toast } from '../ui/Toasts';

/** The day's four competitions hung on the meridian, each at its hour. */
export function DayTimeline() {
  const day = useGame((s) => s.day);
  const layout = useLayout();
  const light = useLight();
  if (!day) return null;
  const tomorrow = day.tomorrow;
  return (
    <Section style={{ paddingVertical: layout.isPhone ? 56 : 104 }} accessibilityLabel="Today's competitions">
      <Container style={{ gap: layout.isPhone ? 28 : 48 }}>
        <View style={{ gap: 14 }}>
          <Reveal>
            <Eyebrow>{copy.day.eyebrow}</Eyebrow>
          </Reveal>
          <WordsReveal text={copy.day.title} style={layout.type.xl} color={light.ink} />
        </View>
        <View>
          <Spine />
          {day.competitions.map((c, i) => (
            <Reveal key={c.id} delay={i * 90}>
              <CompetitionRow competition={c} />
            </Reveal>
          ))}
        </View>
        {tomorrow.length ? (
          <View style={{ gap: 8, marginTop: layout.isPhone ? 8 : 16 }}>
            <Reveal>
              <T v="label" muted>
                {copy.day.tomorrow}
              </T>
            </Reveal>
            {tomorrow.map((c, i) => (
              <Reveal key={c.id} delay={i * 80}>
                <CompetitionRow competition={c} compact />
              </Reveal>
            ))}
          </View>
        ) : null}
      </Container>
    </Section>
  );
}

const TIME_COL = 168;

/** The meridian itself: drawn down the page as you scroll past the day. */
function Spine() {
  const light = useLight();
  const { isPhone } = useLayout();
  const scene = useScene();
  const section = useSection();
  const motion = useMotionOK();
  const draw = useAnimatedStyle(() => {
    if (!scene || !section || !motion) return { transform: [{ scaleY: 1 }] };
    const p = (scene.scrollY.value + scene.viewport.value * 0.7 - section.top.value) / Math.max(1, section.height.value * 0.8);
    return { transform: [{ scaleY: Math.min(1, Math.max(0, p)) }] };
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: isPhone ? 7 : TIME_COL + 15, top: 8, bottom: 8, width: 2 }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: light.line }]} />
      <Animated.View style={[{ flex: 1, backgroundColor: light.sun, transformOrigin: 'top' }, draw]} />
    </View>
  );
}

function CompetitionRow({ competition: c, compact }: { competition: Competition; compact?: boolean }) {
  const backend = useBackend();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const light = useLight();
  const layout = useLayout();
  const openPreview = usePreviewSheet((s) => s.setOpen);
  const [busy, setBusy] = useState(false);
  const s = SESSIONS[c.kind];
  const st = statusOf(c, now, day);
  const toneName = lightOf(c, now);
  const tone = LIGHTS[toneName];
  const isDaily = c.kind === 'daily';
  const windowMinutes = isDaily ? localZone.minutesOf(now) : localZone.minutesOf(c.opensAt);

  const register = async (cancel = false) => {
    setBusy(true);
    try {
      if (cancel) await backend.unregister(c.id);
      else await backend.register(c.id);
      toast(cancel ? `Registration for ${s.title} cancelled.` : `Registered for ${s.title}. Doors open at ${clockTime(c.opensAt)}.`);
    } catch (e) {
      toast(isGameError(e) ? e.message : 'Couldn’t reach the server. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const enter = (e: GestureResponderEvent) => playCurtain(e, tone.sun, () => router.push(`/run/${c.id}`));

  // What's happening, in one line.
  const bits: string[] = [];
  if (st.phase === 'upcoming') {
    if (st.reg === 'not-yet' && c.regOpensAt) bits.push(copy.day.registrationOpensIn(countdown(c.regOpensAt - now)));
    else {
      if (c.registeredCount) bits.push(copy.day.registeredCount(num(c.registeredCount)));
      bits.push(copy.day.doorsIn(countdown(c.opensAt - now)));
    }
  } else if (st.phase === 'open') {
    if (c.liveCount) bits.push(copy.day.playingNow(num(c.liveCount)));
    if (isDaily) bits.push(copy.day.played(num(c.playersCount)));
    bits.push(copy.day.closesIn(countdown(c.closesAt - now)));
  } else if (st.phase === 'closing') {
    bits.push(copy.day.crownedIn(countdown(c.crownAt - now)));
  } else if (c.champion) {
    bits.push(copy.day.crowned(c.champion.handle, signed(c.champion.score)));
  }

  const action = st.running ? (
    <Button label="Back to your run" size="m" onPress={() => router.push(`/run/${c.id}`)} />
  ) : st.canEnter ? (
    <Button label={copy.day.enter(s.title)} size="m" onPress={enter} />
  ) : st.mine ? (
    <Button label={`${copy.day.results}: ${signed(st.mine.score)}`} size="m" variant="ink" href={`/results/${c.id}`} icon="arrow-right" />
  ) : st.canRegister ? (
    <Button label={copy.day.register} size="m" variant="ink" icon="arrow-right" loading={busy} onPress={() => register()} />
  ) : st.canCancel ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <View style={{ height: 48, paddingHorizontal: 18, borderRadius: 999, backgroundColor: tone.sun, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T v="label" color={tone.onSun}>
          {copy.day.registered}
        </T>
      </View>
      <Button label={copy.day.cancel} size="s" variant="ghost" icon={null} disabled={busy} onPress={() => register(true)} />
    </View>
  ) : st.phase !== 'upcoming' ? (
    <Button label={copy.day.standings} size="m" variant="ghost" href={`/standings?c=${c.id}`} />
  ) : null;

  return (
    <Tap
      feel={false}
      accessible={false}
      focusable={false}
      style={{ flexDirection: layout.isPhone ? 'column' : 'row', paddingVertical: compact ? 14 : layout.isPhone ? 22 : 30, gap: layout.isPhone ? 10 : 0 }}
    >
      {({ hovered }) => (
        <>
          {/* Time */}
          <View style={{ width: layout.isPhone ? undefined : TIME_COL, paddingLeft: layout.isPhone ? 28 : 0 }}>
            <T
              v="l"
              style={{ fontFamily: hovered ? FONTS.extra : FONTS.thin, fontSize: compact ? 30 : layout.isPhone ? 34 : 54, lineHeight: compact ? 32 : layout.isPhone ? 36 : 56 }}
            >
              {isDaily ? '00:00' : clockTime(c.opensAt)}
            </T>
            <T v="label" muted>
              {isDaily ? copy.day.allDay : `until ${clockTime(c.closesAt)}`}
            </T>
          </View>
          {/* Node on the spine */}
          {!layout.isPhone ? (
            <View style={{ width: 32, alignItems: 'center', paddingTop: compact ? 10 : 18 }}>
              <View
                style={{
                  width: hovered ? 18 : 14,
                  height: hovered ? 18 : 14,
                  borderRadius: 9,
                  backgroundColor: tone.sun,
                  borderWidth: 3,
                  borderColor: light.field,
                }}
              />
            </View>
          ) : (
            <View style={{ position: 'absolute', left: 1, top: compact ? 22 : 30, width: 14, height: 14, borderRadius: 7, backgroundColor: tone.sun, borderWidth: 3, borderColor: light.field }} />
          )}
          {/* Body */}
          <View style={{ flex: layout.isPhone ? undefined : 1, gap: compact ? 6 : 10, paddingLeft: layout.isPhone ? 28 : 18, transform: [{ translateX: hovered && !layout.isPhone ? 6 : 0 }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T v="label" muted>
                {s.eyebrow}
              </T>
              {st.phase === 'open' ? <LiveDot size={6} color={tone.sun} /> : null}
            </View>
            <Tap href={`/competition/${c.id}`} accessibilityRole="link" accessibilityLabel={`${s.title}, details`} style={{ alignSelf: 'flex-start' }}>
              <T v={compact ? 's' : 'l'} accessibilityRole="header">
                {s.title}
              </T>
            </Tap>
            {!compact ? (
              <T v="body" muted style={{ maxWidth: 520 }}>
                {s.blurb}
              </T>
            ) : null}
            {bits.length ? (
              <T v="label" color={st.phase === 'open' ? light.sunText : light.ink}>
                {bits.join('  ·  ')}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
              {action}
              {backend.preview && st.phase === 'upcoming' && !compact ? (
                <Button label={copy.day.preview} size="s" variant="ghost" icon="arrow-right" onPress={() => openPreview(true)} />
              ) : null}
            </View>
          </View>
          {!compact && !layout.isPhone ? (
            <View style={{ paddingLeft: 24, paddingTop: 6 }}>
              <LightWindow
                light={toneName}
                minutes={windowMinutes}
                label={isDaily ? `Now · ${tone.label}` : `${clockTime(c.opensAt)} · ${tone.label}`}
                width={layout.isDesktop ? 340 : 220}
                height={layout.isDesktop ? 210 : 150}
                lifted={hovered}
              />
            </View>
          ) : null}
        </>
      )}
    </Tap>
  );
}
