import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SESSIONS } from '@shared/schedule';
import type { Competition } from '@shared/types';
import { clockTime } from '@/lib/format';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { LIGHTS } from '@/theme/palette';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

/** Room for "First Light 08:00" in 10 px mono, with headroom for larger system text. */
const LABEL_WIDTH = 200;

/**
 * The day as a 24-hour rule: every hour a tick (and one skip), each session
 * a block where it sits, the Daily underlining all of it, and a needle at now.
 */
export function DayRuler({ competitions, now, dayStart }: { competitions: Competition[]; now: number; dayStart: number }) {
  const light = useLight();
  const { isPhone } = useLayout();
  const [width, setWidth] = useState(0);
  const span = 24 * 3600_000;
  const at = (t: number) => Math.max(0, Math.min(1, (t - dayStart) / span)) * width;
  const nowX = at(now);
  const sessions = competitions.filter((c) => c.kind !== 'daily');

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: isPhone ? 96 : 88, justifyContent: 'flex-end' }}
      accessible
      accessibilityLabel={`Today's schedule. Now ${clockTime(now)}. ${sessions
        .map((c) => `${SESSIONS[c.kind].title} ${clockTime(c.opensAt)} to ${clockTime(c.closesAt)}`)
        .join('. ')}. The Daily runs all day.`}
    >
      {width > 0 ? (
        <>
          {/* Hour ticks */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 22, height: 14 }} pointerEvents="none">
            {Array.from({ length: 25 }, (_, h) => (
              <View
                key={h}
                style={{
                  position: 'absolute',
                  left: (h / 24) * width - 0.75,
                  bottom: 0,
                  width: 1.5,
                  height: h % 6 === 0 ? 14 : 7,
                  backgroundColor: light.line,
                }}
              />
            ))}
          </View>
          {/* The Daily: the whole day */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 20, height: 2, backgroundColor: light.ink, opacity: 0.35 }} />
          {/* Past */}
          <View style={{ position: 'absolute', left: 0, width: nowX, bottom: 20, height: 2, backgroundColor: light.sun }} />
          {/* Hour labels */}
          {[0, 6, 12, 18, 24].map((h) => (
            <T
              key={h}
              v="label"
              muted
              style={{ position: 'absolute', bottom: 0, left: Math.min(width - 18, Math.max(0, (h / 24) * width - 8)), fontSize: 10 }}
            >
              {String(h).padStart(2, '0')}
            </T>
          ))}
          {/* Sessions */}
          {sessions.map((c) => {
            const x = at(c.opensAt);
            const w = Math.max(14, at(c.closesAt) - x);
            const sun = LIGHTS[SESSIONS[c.kind].light === 'live' ? light.name : (SESSIONS[c.kind].light as keyof typeof LIGHTS)].sun;
            return (
              <Tap
                key={c.id}
                onPress={() => router.push(`/competition/${c.id}`)}
                accessibilityRole="link"
                accessibilityLabel={`${SESSIONS[c.kind].title}, ${clockTime(c.opensAt)}`}
                style={{ position: 'absolute', left: x - 6, bottom: 14, width: w + 12, height: isPhone ? 70 : 64, justifyContent: 'flex-end' }}
              >
                {({ hovered }) => (
                  <>
                    {/* Wider than the session's bar: native layout would otherwise squeeze the label to its tap area and cut the time short. */}
                    <View style={{ position: 'absolute', left: isPhone ? -4 : 6, top: 0, width: LABEL_WIDTH, flexDirection: 'row', alignItems: 'center', gap: 6 }} pointerEvents="none">
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sun }} />
                      <T v="label" color={hovered ? light.ink : light.muted} style={{ fontSize: 10 }} numberOfLines={1}>
                        {isPhone ? clockTime(c.opensAt) : `${SESSIONS[c.kind].title} ${clockTime(c.opensAt)}`}
                      </T>
                    </View>
                    <View
                      style={{
                        marginLeft: 6,
                        width: w,
                        height: hovered ? 14 : 10,
                        borderRadius: 6,
                        backgroundColor: sun,
                        marginBottom: 2,
                      }}
                    />
                  </>
                )}
              </Tap>
            );
          })}
          {/* Now */}
          <View pointerEvents="none" style={{ position: 'absolute', left: nowX - 1, bottom: 12, width: 2, height: 44, backgroundColor: light.ink }} />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: nowX - 6, bottom: 52, width: 12, height: 12, borderRadius: 6, backgroundColor: light.ink, borderWidth: 3, borderColor: light.field }}
          />
        </>
      ) : null}
    </View>
  );
}
