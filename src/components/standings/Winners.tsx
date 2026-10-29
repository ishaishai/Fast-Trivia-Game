import { View } from 'react-native';
import { KINDS, SESSIONS } from '@shared/schedule';
import { useChampions } from '@/hooks/useChampions';
import { monthShort, num, signed, weekdayLong } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { Sunny } from '../brand/Sunny';
import { Icon } from '../icons';
import { PopIn } from '../motion/Playful';
import { Avatar } from '../profile/Avatar';
import { SessionTile } from '../sky/SessionTile';
import { Card } from '../ui/Card';
import { Chip } from '../ui/bits';
import { T } from '../ui/Text';

/** Who won what, day by day. Tap a winner to see that game's ranks. */
export function Winners() {
  const light = useLight();
  const layout = useLayout();
  const uid = useGame((s) => s.profile?.uid);
  const today = useGame((s) => s.day?.dayKey);
  const { records, byDay, regulars, mine } = useChampions(14);
  const columns = layout.isDesktop ? 4 : 2;
  return (
    <View style={{ gap: 18 }}>
      <PopIn>
        <Card contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Sunny size={64} mood={mine.length ? 'proud' : 'happy'} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="s">{mine.length ? `You have ${mine.length} crown${mine.length === 1 ? '' : 's'}!` : 'No crowns yet'}</T>
            <T v="bodyS" muted>
              {mine.length ? 'Every crown is a game you won.' : 'Win any game to get a crown here.'}
            </T>
          </View>
        </Card>
      </PopIn>

      {regulars.length ? (
        <PopIn index={1}>
          <Card contentStyle={{ gap: 12 }}>
            <T v="s" accessibilityRole="header">
              Most crowns lately
            </T>
            {regulars.map((r, i) => (
              <View key={r.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <T v="m" style={{ width: 22 }}>
                  {String(i + 1)}
                </T>
                <Avatar seed={r.seed} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="title" fit={0.6}>
                    {r.uid === uid ? `@${r.handle} (you)` : `@${r.handle}`}
                  </T>
                  {r.city ? (
                    <T v="label" muted>
                      {r.city}
                    </T>
                  ) : null}
                </View>
                <Chip tone="sun" icon="crown">
                  {num(r.crowns)}
                </Chip>
              </View>
            ))}
          </Card>
        </PopIn>
      ) : null}

      {records && byDay.length === 0 ? (
        <T v="bodyL" muted>
          No winners yet. The first crown lands when the first game ends.
        </T>
      ) : null}

      {byDay.map(([dayKey, list], d) => {
        const date = new Date(`${dayKey}T12:00:00`).getTime();
        const byKind = new Map(list.map((r) => [r.kind, r]));
        return (
          <PopIn key={dayKey} index={Math.min(d, 4) + 2} style={{ gap: 10 }}>
            <T v="s" accessibilityRole="header">
              {`${weekdayLong(date)} ${new Date(date).getDate()} ${monthShort(date)}`}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {KINDS.map((k) => {
                const r = byKind.get(k);
                const isMine = r?.uid === uid;
                return (
                  <View key={k} style={{ width: `${100 / columns - 2}%`, flexGrow: 1 }}>
                    <Card
                      href={r ? `/standings?c=${r.competitionId}` : undefined}
                      tone={isMine ? 'sun' : 'white'}
                      pad={12}
                      shadow="flat"
                      accessibilityLabel={r ? `${SESSIONS[k].title}: @${r.handle}, ${r.score} points${isMine ? ', you' : ''}` : `${SESSIONS[k].title}: no winner`}
                      contentStyle={{ gap: 8, minHeight: 104 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <SessionTile kind={k} size={26} />
                        <T v="label" color={isMine ? light.onSun : light.card.muted} fit={0.8} style={{ flexShrink: 1 }}>
                          {SESSIONS[k].title}
                        </T>
                      </View>
                      {r ? (
                        <>
                          <T v="title" color={isMine ? light.onSun : light.card.ink} fit={0.6}>
                            {isMine ? 'You won!' : `@${r.handle}`}
                          </T>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Icon name="crown" color={isMine ? light.onSun : '#E09A00'} size={16} strokeWidth={2.4} filled />
                            <T v="label" color={isMine ? light.onSun : light.card.ink}>
                              {signed(r.score)}
                            </T>
                          </View>
                        </>
                      ) : (
                        <T v="bodyS" color={light.card.muted}>
                          {dayKey === today ? 'Not over yet' : 'No winner'}
                        </T>
                      )}
                    </Card>
                  </View>
                );
              })}
            </View>
          </PopIn>
        );
      })}
    </View>
  );
}
