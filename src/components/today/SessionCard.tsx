import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { isGameError } from '@shared/errors';
import { SESSIONS } from '@shared/schedule';
import { useBackend } from '@/backend/BackendProvider';
import { copy } from '@/copy/en';
import { useNow } from '@/hooks/useNow';
import { clockTime } from '@/lib/format';
import { actionOf, lightOf, type SessionSlot } from '@/lib/status';
import { statusLine } from '@/lib/statusLine';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { LIGHTS } from '@/theme/palette';
import { useSquish } from '../motion/Playful';
import { playCurtain } from '../nav/TransitionOverlay';
import { SessionTile } from '../sky/SessionTile';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/bits';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';
import { toast } from '../ui/Toasts';

/** One session as one row: its sky, its name, what's happening, one button. */
export function SessionCard({ slot }: { slot: SessionSlot }) {
  const backend = useBackend();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const light = useLight();
  const { width } = useLayout();
  // On a phone the button gets its own line, so the sentence never squeezes into a column.
  const narrow = width < 460;
  const [busy, setBusy] = useState(false);
  const c = slot.competition;
  const s = SESSIONS[c.kind];
  const action = actionOf(c, now, day);
  const tomorrow = Boolean(day && c.dayKey !== day.dayKey);
  const line = slot.earlier?.champion && action.kind !== 'done' ? copy.status.todayWinner(slot.earlier.champion.handle) : statusLine(action, c, now);
  const detail = action.kind === 'register' || action.kind === 'soon' ? statusLine(action, c, now) : null;

  const register = async () => {
    setBusy(true);
    try {
      await backend.register(c.id);
      toast(`You’re in! ${s.title} starts at ${clockTime(c.opensAt)}${tomorrow ? ' tomorrow' : ''}.`);
    } catch (e) {
      toast(isGameError(e) ? e.message : 'Couldn’t reach the server. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const enter = (e: GestureResponderEvent) => playCurtain(e, LIGHTS[lightOf(c, now)].sun, () => router.push(`/run/${c.id}`));

  const button =
    action.kind === 'resume' ? (
      <Button label={copy.play.keepPlaying} size="s" onPress={() => router.push(`/run/${c.id}`)} />
    ) : action.kind === 'play' ? (
      <Button label={copy.play.play} size="s" iconLeft="play" idle="pulse" onPress={enter} accessibilityLabel={`Play ${s.title}`} />
    ) : action.kind === 'register' ? (
      <Button label={copy.play.saveSpot} size="s" loading={busy} onPress={register} accessibilityLabel={`Save my spot in ${s.title}`} />
    ) : action.kind === 'registered' ? (
      <Chip tone="good" icon="check">
        {copy.play.youreIn}
      </Chip>
    ) : action.kind === 'done' ? (
      <Button label={copy.play.myScore} size="s" variant="ink" href={`/results/${c.id}`} />
    ) : action.kind === 'missed' || action.kind === 'closing' || action.kind === 'final' ? (
      <Button label={action.kind === 'missed' ? copy.play.watch : copy.play.ranks} size="s" variant="ink" href={`/standings?c=${c.id}`} />
    ) : null;

  return (
    <Card pad={12} shadow="flat" contentStyle={{ flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'stretch' : 'center', gap: 10 }}>
      {/* The card's name opens its page; the button does the one thing. Two separate targets, never nested. */}
      <Tap
        href={`/competition/${c.id}`}
        accessibilityRole="link"
        accessibilityLabel={`${s.title}, ${tomorrow ? 'tomorrow ' : ''}${clockTime(c.opensAt)}. ${line}`}
        accessibilityHint="Opens the game’s page"
        style={{ flex: 1, borderRadius: 16 }}
      >
        {({ pressed }) => (
          <Row pressed={pressed}>
            <SessionTile kind={c.kind} size={58} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="s" fit={0.8}>
                {s.title}
              </T>
              <T v="label" muted>
                {`${tomorrow ? 'Tomorrow' : copy.sessions[c.kind].tag} · ${clockTime(c.opensAt)}`}
              </T>
              <T v="bodyS" color={action.kind === 'play' ? light.card.sunText : light.card.muted} style={{ marginTop: 2 }}>
                {detail && slot.earlier?.champion ? `${line}. ${detail}` : line}
              </T>
            </View>
          </Row>
        )}
      </Tap>
      {button ? <View style={narrow ? { paddingLeft: 72, alignItems: 'flex-start' } : null}>{button}</View> : null}
    </Card>
  );
}

function Row({ pressed, children }: { pressed: boolean; children: ReactNode }) {
  const squish = useSquish(pressed, 0.97);
  return <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 2 }, squish]}>{children}</Animated.View>;
}
