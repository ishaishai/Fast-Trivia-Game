import Head from 'expo-router/head';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { KINDS, SESSIONS } from '@shared/schedule';
import type { ChampionRecord, LightState } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { Icon } from '@/components/icons';
import { WordsReveal } from '@/components/motion/Kinetic';
import { Reveal, Section } from '@/components/motion/ScrollScene';
import { Avatar } from '@/components/profile/Avatar';
import { Container, Page } from '@/components/ui/Page';
import { Eyebrow, Hairline } from '@/components/ui/bits';
import { Tap } from '@/components/ui/Tap';
import { T } from '@/components/ui/Text';
import { Segmented } from '@/components/ui/Toggle';
import { copy } from '@/copy/en';
import { monthShort, num, signed, weekdayLong } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useAmbientLight, useLight } from '@/theme/LightProvider';
import { LIGHTS } from '@/theme/palette';
import { FONTS } from '@/theme/typography';

export default function Champions() {
  const backend = useBackend();
  const layout = useLayout();
  const light = useLight();
  const uid = useGame((s) => s.profile?.uid);
  const [records, setRecords] = useState<ChampionRecord[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  useEffect(() => {
    void backend.getChampions(14).then(setRecords);
  }, [backend]);

  const days = useMemo(() => {
    const byDay = new Map<string, ChampionRecord[]>();
    for (const r of records ?? []) {
      if (filter === 'mine' && r.uid !== uid) continue;
      byDay.set(r.dayKey, [...(byDay.get(r.dayKey) ?? []), r]);
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filter, records, uid]);

  const regulars = useMemo(() => {
    const counts = new Map<string, { handle: string; city: string; seed: number; crowns: number; uid: string }>();
    for (const r of records ?? []) {
      const e = counts.get(r.uid) ?? { handle: r.handle, city: r.city, seed: r.avatarSeed, crowns: 0, uid: r.uid };
      e.crowns += 1;
      counts.set(r.uid, e);
    }
    return [...counts.values()].sort((a, b) => b.crowns - a.crowns).slice(0, 5);
  }, [records]);
  const mine = (records ?? []).filter((r) => r.uid === uid).length;

  return (
    <Page>
      <Head>
        <title>Hall of Crowns — Meridian</title>
      </Head>
      <Section>
        <Container style={{ gap: 24 }}>
          <Reveal>
            <Eyebrow>{copy.hall.eyebrow}</Eyebrow>
          </Reveal>
          <WordsReveal text={copy.hall.title} style={layout.type.hero} color={light.ink} containerStyle={{ maxWidth: 1100 }} />
          <Reveal delay={150}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 40, borderRadius: 999, backgroundColor: light.sun }}>
                <Icon name="crown" color={light.onSun} size={18} />
                <T v="label" color={light.onSun}>
                  {copy.hall.yours}: {mine}
                </T>
              </View>
              <Segmented
                label="Show"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: copy.hall.all },
                  { value: 'mine', label: copy.hall.mine },
                ]}
              />
            </View>
          </Reveal>
        </Container>
      </Section>

      {regulars.length ? (
        <Section style={{ paddingTop: layout.isPhone ? 40 : 72 }}>
          <Container style={{ gap: 18 }}>
            <Reveal>
              <T v="label" muted>
                {copy.hall.regulars}
              </T>
            </Reveal>
            <View style={{ flexDirection: layout.isPhone ? 'column' : 'row', flexWrap: 'wrap', gap: layout.isPhone ? 10 : 18 }}>
              {regulars.map((r, i) => (
                <Reveal key={r.uid} delay={i * 70}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 12,
                      paddingLeft: 12,
                      paddingRight: 22,
                      borderRadius: 999,
                      backgroundColor: r.uid === uid ? light.sun : light.raised,
                    }}
                  >
                    <Avatar seed={r.seed} size={40} />
                    <View style={{ flexShrink: 1 }}>
                      <T v="title" color={r.uid === uid ? light.onSun : light.ink} fit={0.7}>
                        @{r.handle}
                      </T>
                      <T v="label" color={r.uid === uid ? light.onSun : light.muted} style={{ fontSize: 10 }}>
                        {r.city}
                      </T>
                    </View>
                    <T v="l" color={r.uid === uid ? light.onSun : light.ink} style={{ fontFamily: FONTS.black, marginLeft: 8 }}>
                      {r.crowns}
                    </T>
                  </View>
                </Reveal>
              ))}
            </View>
          </Container>
        </Section>
      ) : null}

      <Section style={{ paddingTop: layout.isPhone ? 40 : 72 }}>
        <Container>
          {days.length === 0 && records ? (
            <T v="bodyL" muted>
              {copy.hall.none}
            </T>
          ) : null}
          {days.map(([dayKey, list], i) => (
            <Reveal key={dayKey} delay={Math.min(i, 4) * 60}>
              <DayRow dayKey={dayKey} list={list} uid={uid} onlyMine={filter === 'mine'} />
            </Reveal>
          ))}
        </Container>
      </Section>
    </Page>
  );
}

function DayRow({ dayKey, list, uid, onlyMine }: { dayKey: string; list: ChampionRecord[]; uid?: string; onlyMine?: boolean }) {
  const layout = useLayout();
  const light = useLight();
  const ambient = useAmbientLight();
  const date = new Date(`${dayKey}T12:00:00`).getTime();
  const byKind = new Map(list.map((r) => [r.kind, r]));
  const wide = !layout.isPhone;
  return (
    <View style={{ paddingVertical: wide ? 28 : 20, gap: 16 }}>
      <Hairline />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 40 : 14 }}>
        <View style={{ width: wide ? 200 : undefined, flexDirection: wide ? 'column' : 'row', alignItems: wide ? 'flex-start' : 'baseline', gap: wide ? 0 : 12 }}>
          <T v="hero" style={{ fontFamily: FONTS.thin, fontSize: wide ? 112 : 64, lineHeight: wide ? 104 : 62 }}>
            {String(new Date(date).getDate()).padStart(2, '0')}
          </T>
          <T v="label" muted>
            {weekdayLong(date)} · {monthShort(date)}
          </T>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {KINDS.filter((k) => !onlyMine || byKind.has(k)).map((k) => {
            const r = byKind.get(k);
            const lightName: LightState = SESSIONS[k].light === 'live' ? ambient : (SESSIONS[k].light as LightState);
            const tone = LIGHTS[lightName];
            const isMine = r && r.uid === uid;
            return (
              <Tap
                key={k}
                href={r ? `/standings?c=${r.competitionId}` : undefined}
                disabled={!r}
                accessibilityRole="link"
                accessibilityLabel={r ? `${SESSIONS[k].title}: @${r.handle}, ${r.score} points${isMine ? ', you' : ''}` : `${SESSIONS[k].title}: not crowned yet`}
                style={({ hovered }) => ({
                  width: layout.isDesktop ? '24%' : wide ? '48%' : '100%',
                  flexGrow: 1,
                  minHeight: 104,
                  padding: 16,
                  borderRadius: 22,
                  backgroundColor: isMine ? tone.sun : hovered ? light.raised : 'transparent',
                  borderWidth: 1,
                  borderColor: isMine ? tone.sun : light.line,
                  gap: 8,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isMine ? tone.onSun : tone.sun }} />
                  <T v="label" color={isMine ? tone.onSun : light.muted}>
                    {SESSIONS[k].title}
                  </T>
                </View>
                {r ? (
                  <View>
                    {/* The handle gets the card's full width; four cards to a row leave little beside the score. */}
                    <T v="title" color={isMine ? tone.onSun : light.ink} fit={0.6}>
                      @{r.handle}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                      <T v="label" color={isMine ? tone.onSun : light.muted} style={{ fontSize: 10, flexShrink: 1, paddingBottom: 4 }}>
                        {r.city || '—'} · {num(r.players)} played
                      </T>
                      <T v="m" color={isMine ? tone.onSun : light.ink} style={{ fontFamily: FONTS.extra }}>
                        {signed(r.score)}
                      </T>
                    </View>
                  </View>
                ) : (
                  <T v="bodyS" muted>
                    Not crowned yet.
                  </T>
                )}
              </Tap>
            );
          })}
        </View>
      </View>
    </View>
  );
}
