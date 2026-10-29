import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SESSIONS, addDays, localZone, parseCompetitionId } from '@shared/schedule';
import type { ChampionRecord } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import type { WireEvent } from '@/backend/types';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { agoLabel, clockParts, countdown, dayLabel, num, signed } from '@/lib/format';
import { featured } from '@/lib/status';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { LightScope, useLight } from '@/theme/LightProvider';
import { FONTS } from '@/theme/typography';
import { Logo } from '../brand/Logo';
import { Icon } from '../icons';
import { Marquee, WordsReveal } from '../motion/Kinetic';
import { Parallax, Reveal, Section } from '../motion/ScrollScene';
import { TimingTower } from '../standings/TimingTower';
import { Button } from '../ui/Button';
import { Container } from '../ui/Page';
import { Eyebrow, Grain, Hairline, LiveDot } from '../ui/bits';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';
import { TryOne } from './TryOne';

/** A thin live ticker of finishes across today's competitions. */
export function Wire() {
  const backend = useBackend();
  const light = useLight();
  const now = useNow(30_000);
  const [events, setEvents] = useState<WireEvent[]>([]);
  useEffect(() => backend.subscribeWire(setEvents), [backend]);
  if (!events.length) return null;
  return (
    <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: light.line, paddingVertical: 14 }} accessibilityLabel="Recent finishes" role="marquee">
      <Marquee speed={42} gap={40}>
        {events.map((e) => {
          const kind = parseCompetitionId(e.competitionId)?.kind;
          return (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LiveDot size={6} />
              <T v="label">@{e.handle}</T>
              <T v="label" muted>
                {e.city}
              </T>
              <T v="label" muted>
                ran {kind ? SESSIONS[kind].title : 'a run'}:
              </T>
              <T v="label" color={light.sunText}>
                {signed(e.score)}
              </T>
              <T v="label" muted>
                {agoLabel(now - e.at)}
              </T>
            </View>
          );
        })}
      </Marquee>
    </View>
  );
}

/** Live standings for whatever the hero is about. */
export function StandingsPreview() {
  const day = useGame((s) => s.day);
  const now = useNow(5000);
  const layout = useLayout();
  const light = useLight();
  const c = day ? featured(day, now) : null;
  const board = useLeaderboard(c?.id, 8);
  if (!c) return null;
  const title = SESSIONS[c.kind].title;
  const leader = board?.rows[0];
  const me = board?.me;
  const wide = layout.isDesktop;
  return (
    <Section style={{ paddingVertical: layout.isPhone ? 56 : 96 }} accessibilityLabel="Live standings">
      <Container style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 64 : 32 }}>
        <View style={{ flex: wide ? 0.9 : undefined, gap: 22 }}>
          <Reveal>
            <Eyebrow>{`${copy.standings.eyebrow} · ${title}`}</Eyebrow>
          </Reveal>
          <WordsReveal text="Right now." style={layout.type.xl} color={light.ink} />
          <Reveal delay={150}>
            <View style={{ gap: 18, marginTop: 8 }}>
              <Stat label={copy.standings.crownLine} value={leader ? signed(leader.score) : '—'} big />
              <View style={{ flexDirection: 'row', gap: 32, flexWrap: 'wrap' }}>
                <Stat label={copy.standings.players} value={num(board?.total ?? 0)} />
                <Stat label={copy.standings.playingNow} value={num(board?.live ?? 0)} />
                {me && leader ? <Stat label={copy.standings.gap} value={me.uid === leader.uid ? 'Yours' : String(leader.score - me.score)} /> : null}
              </View>
            </View>
          </Reveal>
          <Reveal delay={250}>
            <Button label={copy.standings.full} variant="ink" href={`/standings?c=${c.id}`} icon="arrow-right" />
          </Reveal>
        </View>
        <Reveal delay={120} style={{ flex: wide ? 1.3 : undefined }}>
          {board && board.rows.length === 0 ? (
            <T v="bodyL" muted>
              {copy.standings.empty}
            </T>
          ) : (
            <TimingTower board={board} limit={8} />
          )}
        </Reveal>
      </Container>
    </Section>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const layout = useLayout();
  return (
    <View style={{ gap: 2 }}>
      <T v="label" muted>
        {label}
      </T>
      <T v={big ? 'xl' : 'm'} style={{ fontFamily: FONTS.extra, fontVariant: ['tabular-nums'], ...(big ? { fontSize: (layout.type.xl.fontSize as number) * 1.1 } : null) }}>
        {value}
      </T>
    </View>
  );
}

/** The rules as type: six numbers that are the whole game. */
export function RulesShowcase() {
  const layout = useLayout();
  const light = useLight();
  const cols = layout.isDesktop ? 3 : layout.isPhone ? 1 : 2;
  return (
    <Section style={{ paddingVertical: layout.isPhone ? 56 : 104 }} accessibilityLabel="The rules">
      <Container style={{ gap: layout.isPhone ? 32 : 56 }}>
        <View style={{ gap: 14 }}>
          <Reveal>
            <Eyebrow>{copy.rules.eyebrow}</Eyebrow>
          </Reveal>
          <WordsReveal text={copy.rules.title} style={layout.type.xl} color={light.ink} containerStyle={{ maxWidth: 980 }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -12 }}>
          {copy.rules.numbers.map((item, i) => (
            <View key={item.n} style={{ width: `${100 / cols}%`, paddingHorizontal: 12, paddingVertical: layout.isPhone ? 14 : 22 }}>
              <Reveal delay={(i % cols) * 110}>
                <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: light.line, paddingTop: 18 }}>
                  <Parallax speed={cols > 1 ? -0.03 - (i % cols) * 0.025 : 0}>
                    <T
                      v="hero"
                      style={{ fontSize: layout.isPhone ? 92 : (layout.type.hero.fontSize as number) * 0.62, lineHeight: layout.isPhone ? 88 : (layout.type.hero.fontSize as number) * 0.56 }}
                      color={i === 2 ? light.sunText : light.ink}
                    >
                      {item.n}
                    </T>
                  </Parallax>
                  <T v="bodyL" muted style={{ maxWidth: 340 }}>
                    {item.text}
                  </T>
                </View>
              </Reveal>
            </View>
          ))}
        </View>
        <Reveal>
          <View style={{ gap: 16 }}>
            <T v="l">{copy.rules.tryTitle}</T>
            <TryOne />
          </View>
        </Reveal>
        <Reveal>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <Button label="Practice a full run" variant="ink" icon="play" href="/run/practice" />
            <Button label="Read every rule" variant="ghost" href="/rules" />
          </View>
        </Reveal>
      </Container>
    </Section>
  );
}

/** Recent champions drift by. */
export function CrownMarquee() {
  const backend = useBackend();
  const layout = useLayout();
  const light = useLight();
  const [champions, setChampions] = useState<ChampionRecord[]>([]);
  useEffect(() => {
    void backend.getChampions(4).then(setChampions);
  }, [backend]);
  if (!champions.length) return null;
  return (
    <Section style={{ paddingVertical: layout.isPhone ? 40 : 72, gap: 28 }} accessibilityLabel={copy.hall.eyebrow}>
      <Container style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ gap: 14 }}>
          <Reveal>
            <Eyebrow>{copy.hall.eyebrow}</Eyebrow>
          </Reveal>
          <WordsReveal text="Who held the day." style={layout.type.l} color={light.ink} />
        </View>
        <Reveal>
          <Button label={copy.hall.all} variant="ghost" href="/champions" />
        </Reveal>
      </Container>
      <Marquee speed={30} gap={22}>
        {champions.slice(0, 12).map((c) => (
            <Tap
              key={c.competitionId}
              href={`/standings?c=${c.competitionId}`}
              accessibilityRole="link"
              accessibilityLabel={`${SESSIONS[c.kind].title}, ${dayLabel(c.closesAt)}: @${c.handle}, ${c.score} points`}
              style={({ hovered }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 999,
                backgroundColor: hovered ? light.sun : light.raised,
              })}
            >
              {({ hovered }) => (
                <>
                  <Icon name="crown" color={hovered ? light.onSun : light.sunText} size={18} />
                  <T v="title" color={hovered ? light.onSun : light.ink}>
                    @{c.handle}
                  </T>
                  <T v="label" color={hovered ? light.onSun : light.muted}>
                    {SESSIONS[c.kind].title} · {dayLabel(c.closesAt)}
                  </T>
                  <T v="m" color={hovered ? light.onSun : light.ink} style={{ fontFamily: FONTS.extra, fontSize: 24, lineHeight: 26 }}>
                    {signed(c.score)}
                  </T>
                </>
              )}
            </Tap>
        ))}
      </Marquee>
    </Section>
  );
}

/** The page ends at midnight. */
export function MidnightFooter() {
  return (
    <LightScope name="midnight">
      <FooterBody />
    </LightScope>
  );
}

function FooterBody() {
  const backend = useBackend();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const layout = useLayout();
  const light = useLight();
  const midnight = day ? localZone.toEpoch(addDays(day.dayKey, 1), 0) : now;
  const left = countdown(midnight - now);
  const t = clockParts(now);
  const size = layout.isPhone ? 72 : Math.min(240, layout.width * 0.16);
  const links: { href: '/' | '/standings' | '/champions' | '/rules' | '/you'; label: string }[] = [
    { href: '/', label: 'Today' },
    { href: '/standings', label: 'Standings' },
    { href: '/champions', label: 'Champions' },
    { href: '/rules', label: 'Rules' },
    { href: '/you', label: 'You' },
  ];
  return (
    <Section style={{ backgroundColor: light.field, paddingTop: layout.isPhone ? 64 : 120, paddingBottom: 48, overflow: 'hidden' }} accessibilityLabel="Footer">
      <Grain />
      <Container style={{ gap: layout.isPhone ? 36 : 56 }}>
        <View style={{ gap: 10 }}>
          <Reveal>
            <Eyebrow>{copy.footer.midnightIn}</Eyebrow>
          </Reveal>
          <Reveal delay={100}>
            <T
              v="hero"
              accessibilityLabel={`${left} until midnight`}
              style={{ fontFamily: FONTS.thin, fontSize: size, lineHeight: size * 0.95, letterSpacing: -size * 0.02, fontVariant: ['tabular-nums'] }}
            >
              {left}
            </T>
          </Reveal>
          <Reveal delay={200}>
            <T v="l" style={{ fontFamily: FONTS.light }}>
              {copy.footer.line}
            </T>
          </Reveal>
        </View>
        <Hairline />
        <View style={{ flexDirection: layout.isPhone ? 'column' : 'row', justifyContent: 'space-between', gap: 28 }}>
          <View style={{ gap: 14, maxWidth: 420 }}>
            <Logo size={16} />
            <T v="bodyS" muted>
              {copy.footer.credit}
            </T>
            <T v="label" muted>
              {backend.label} · {t.hh}:{t.mm}
            </T>
          </View>
          <View role="navigation" aria-label="Footer" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {links.map((l) => (
              <Button key={l.href} label={l.label} variant="ghost" size="s" icon={null} href={l.href} />
            ))}
          </View>
        </View>
      </Container>
    </Section>
  );
}
