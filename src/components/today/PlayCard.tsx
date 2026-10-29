import { router, useIsFocused } from 'expo-router';
import { View, type GestureResponderEvent } from 'react-native';
import { SESSIONS } from '@shared/schedule';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { num, signed } from '@/lib/format';
import { actionOf, primaryCompetition } from '@/lib/status';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { radius } from '@/theme/shape';
import { Sunny } from '../brand/Sunny';
import { Float, useAmbientClock } from '../motion/Playful';
import { playCurtain } from '../nav/TransitionOverlay';
import { WorldDecor } from '../sky/World';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/bits';
import { Gradient } from '../ui/Gradient';
import { T } from '../ui/Text';

/**
 * The one thing to do today, as big as it can be: today's game, one line
 * about it, and a button you can't miss.
 */
export function PlayCard() {
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const light = useLight();
  const layout = useLayout();
  const c = day ? primaryCompetition(day, now) : null;
  const board = useLeaderboard(c?.id, 3);
  if (!day || !c) return null;
  const action = actionOf(c, now, day);
  const title = SESSIONS[c.kind].title;
  const leader = board?.rows[0] ?? null;
  const rank = board?.myRank ?? null;
  const isLeader = Boolean(board?.me && leader && board.me.uid === leader.uid);

  let line: string;
  if (action.kind === 'resume') line = copy.play.stillGoing;
  else if (action.kind === 'done') line = isLeader ? copy.play.youLead : copy.play.youScored(action.score, signed(action.score));
  else if (c.kind !== 'daily' && action.kind === 'play') line = copy.play.sessionOpen(title);
  else line = leader ? copy.play.topScore(num(leader.score)) : copy.play.beFirst;

  const enter = (e: GestureResponderEvent) => playCurtain(e, light.sun, () => router.push(`/run/${c.id}`));
  const tall = layout.height > 700;

  return (
    <Card pad={0} radius={radius.xl} accessibilityLabel={`${title}. ${line}`}>
      <Banner height={tall ? 168 : 132} mood={action.kind === 'done' ? 'proud' : 'happy'} />
      <View style={{ padding: 22, paddingTop: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T v="l" fit={0.7} style={{ flexShrink: 1 }} accessibilityRole="header">
            {title}
          </T>
          <Chip tone="solid" icon={action.kind === 'play' || action.kind === 'resume' ? undefined : 'check'} dot={action.kind === 'play'}>
            {action.kind === 'done' ? 'Played' : copy.sessions[c.kind].tag}
          </Chip>
        </View>
        <T v="title" muted>
          {line}
        </T>
        {action.kind === 'done' && rank ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="sun" icon="trophy">{`#${num(rank)} of ${num(board?.total ?? 0)}`}</Chip>
          </View>
        ) : null}
        <View style={{ gap: 12, marginTop: 4 }}>
          {action.kind === 'resume' ? (
            <Button label={copy.play.keepPlaying} size="xl" iconLeft="play" stretch idle="pulse" onPress={() => router.push(`/run/${c.id}`)} />
          ) : action.kind === 'play' ? (
            <Button
              label={copy.play.play}
              size="xl"
              iconLeft="play"
              stretch
              idle="pulse"
              onPress={enter}
              accessibilityLabel={`Play ${title}`}
              accessibilityHint="Starts your one game for today"
            />
          ) : action.kind === 'done' ? (
            <>
              <Button label={copy.play.practice} size="xl" iconLeft="play" stretch idle="pulse" href="/run/practice" accessibilityHint={copy.play.practiceHint} />
              <Button label={copy.play.myScore} variant="ink" stretch href={`/results/${c.id}`} />
            </>
          ) : (
            <Button label={copy.play.ranks} variant="ink" stretch href={`/standings?c=${c.id}`} />
          )}
        </View>
      </View>
    </Card>
  );
}

/** The top of the card: a window onto the current sky, with Sunny bobbing in it. */
function Banner({ height, mood }: { height: number; mood: 'happy' | 'proud' }) {
  const light = useLight();
  const focused = useIsFocused();
  const t = useAmbientClock(24000, focused);
  return (
    <Gradient colors={light.sky} style={{ height, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <WorldDecor kind={light.decor} t={t} dark={light.statusBar === 'light'} height={height} />
      <Float amplitude={7}>
        <Sunny size={height * 0.86} mood={mood} />
      </Float>
    </Gradient>
  );
}
