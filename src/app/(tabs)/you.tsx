import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { isGameError } from '@shared/errors';
import { SESSIONS } from '@shared/schedule';
import type { ChampionRecord, PlayerStats } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { Icon } from '@/components/icons';
import { WordsReveal } from '@/components/motion/Kinetic';
import { Reveal, Section } from '@/components/motion/ScrollScene';
import { Avatar } from '@/components/profile/Avatar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Container, Page } from '@/components/ui/Page';
import { Eyebrow, Hairline } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toasts';
import { Segmented, Toggle } from '@/components/ui/Toggle';
import { copy } from '@/copy/en';
import { dayLabel, num, percent, seconds, signed } from '@/lib/format';
import { handleProblem, normalizeHandle } from '@/lib/handles';
import { useGame } from '@/stores/game';
import { useSettings, type MotionPref } from '@/stores/settings';
import { usePreviewSheet } from '@/stores/ui';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { FONTS } from '@/theme/typography';

export default function You() {
  const backend = useBackend();
  const layout = useLayout();
  const light = useLight();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  const day = useGame((s) => s.day);
  const settings = useSettings();
  const openPreview = usePreviewSheet((s) => s.setOpen);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [crowns, setCrowns] = useState<ChampionRecord[]>([]);
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void backend.getStats().then(setStats);
    void backend.getChampions(30).then((all) => setCrowns(all.filter((c) => c.uid === profile?.uid)));
  }, [backend, profile?.uid, day?.dayKey]);

  if (!profile) return <Page>{null}</Page>;
  const wide = layout.isDesktop;
  const dirty = normalizeHandle(handle) !== profile.handle || city.trim() !== profile.city;

  const save = async () => {
    const h = normalizeHandle(handle);
    const problem = handleProblem(h);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      setProfile(await backend.saveProfile({ handle: h, city }));
      toast(copy.you.saved);
    } catch (e) {
      setError(isGameError(e) ? e.message : 'Couldn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const stat: [string, string][] = stats
    ? [
        [copy.you.runs, num(stats.runs)],
        [copy.you.accuracy, percent(stats.correct, stats.answered)],
        [copy.you.best, stats.bestScore === null ? '—' : signed(stats.bestScore)],
        [copy.you.avg, stats.answered ? seconds(stats.answerMs / stats.answered) : '—'],
        [copy.you.crowns, num(stats.crowns)],
        [copy.you.skips, `${day?.skipsLeft ?? 24}/24`],
      ]
    : [];

  return (
    <Page>
      <Head>
        <title>{`@${profile.handle} — Meridian`}</title>
      </Head>
      <Section>
        <Container style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 56 : 24, alignItems: wide ? 'flex-end' : 'flex-start' }}>
          <Reveal>
            <Avatar seed={profile.avatarSeed} size={wide ? 200 : 128} ring={light.sun} />
          </Reveal>
          {/* Stacked on phones: take the full width, so a long handle or city has to fit it rather than run off the edge. */}
          <View style={{ flex: 1, gap: 12, alignSelf: wide ? undefined : 'stretch' }}>
            <Reveal delay={80}>
              <Eyebrow>{copy.you.eyebrow}</Eyebrow>
            </Reveal>
            <WordsReveal text={`@${profile.handle}`} style={{ ...layout.type.xl, fontSize: Math.min(layout.type.xl.fontSize as number, layout.width / 9) }} color={light.ink} delay={120} />
            <Reveal delay={200}>
              <T v="label" muted>
                {profile.city ? `${profile.city} · ` : ''}
                {copy.you.since(dayLabel(profile.createdAt))}
              </T>
            </Reveal>
          </View>
        </Container>
      </Section>

      <Section style={{ paddingTop: layout.isPhone ? 36 : 64 }}>
        <Container>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -12 }}>
            {stat.map(([label, value], i) => (
              <View key={label} style={{ width: wide ? '33.33%' : '50%', paddingHorizontal: 12, paddingVertical: 14 }}>
                <Reveal delay={(i % 3) * 80}>
                  <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: light.line, paddingTop: 14 }}>
                    <T v="label" muted>
                      {label}
                    </T>
                    <T v="xl" fit={0.6} style={{ fontFamily: FONTS.black, fontSize: wide ? 96 : 52, lineHeight: wide ? 92 : 52 }}>
                      {value}
                    </T>
                  </View>
                </Reveal>
              </View>
            ))}
          </View>
        </Container>
      </Section>

      {crowns.length ? (
        <Section style={{ paddingTop: 48 }}>
          <Container style={{ gap: 14 }}>
            <T v="label" muted>
              Titles
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {crowns.map((c) => (
                <View key={c.competitionId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 44, borderRadius: 999, backgroundColor: light.sun }}>
                  <Icon name="crown" color={light.onSun} size={18} />
                  <T v="label" color={light.onSun}>
                    {SESSIONS[c.kind].title} champion · {dayLabel(c.closesAt)} · {signed(c.score)}
                  </T>
                </View>
              ))}
            </View>
          </Container>
        </Section>
      ) : null}

      <Section style={{ paddingTop: layout.isPhone ? 40 : 72, paddingBottom: 32 }}>
        <Container style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 64 : 36 }}>
          <View style={{ flex: 1, gap: 16 }}>
            <T v="l">{copy.you.rename}</T>
            <Field
              label={copy.welcome.nameLabel}
              prefix="@"
              value={handle}
              onChangeText={(v) => {
                setHandle(v);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={16}
              error={error}
            />
            <Field label={copy.welcome.cityLabel} value={city} onChangeText={setCity} maxLength={24} placeholder={copy.welcome.cityPlaceholder} />
            <Button label={copy.you.save} variant="ink" disabled={!dirty} loading={saving} onPress={save} icon={null} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="l" style={{ marginBottom: 8 }}>
              {copy.you.settings}
            </T>
            <Toggle label={copy.you.sound} hint={copy.you.soundHint} value={settings.sound} onChange={settings.setSound} />
            <Hairline />
            {Platform.OS !== 'web' ? (
              <>
                <Toggle label={copy.you.haptics} hint={copy.you.hapticsHint} value={settings.haptics} onChange={settings.setHaptics} />
                <Hairline />
              </>
            ) : null}
            <Toggle label={copy.you.relaxed} hint={copy.you.relaxedHint} value={settings.relaxedPractice} onChange={settings.setRelaxedPractice} />
            <Hairline />
            <View style={{ paddingVertical: 14, gap: 10 }}>
              <T v="title">{copy.you.motion}</T>
              <T v="bodyS" muted>
                {copy.you.motionHint}
              </T>
              <Segmented<MotionPref>
                label={copy.you.motion}
                value={settings.motion}
                onChange={settings.setMotion}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'reduced', label: 'Reduced' },
                  { value: 'full', label: 'Full' },
                ]}
              />
            </View>
            <Hairline />
            <View style={{ paddingVertical: 14, gap: 4 }}>
              <T v="title">{copy.you.server}</T>
              <T v="bodyS" muted>
                {backend.label}
              </T>
            </View>
            {backend.preview ? (
              <>
                <Hairline />
                <View style={{ paddingVertical: 14, gap: 10 }}>
                  <T v="title">{copy.you.preview}</T>
                  <T v="bodyS" muted>
                    {copy.you.previewHint}
                  </T>
                  <Button label="Open preview controls" variant="ink" size="m" icon="warp" onPress={() => openPreview(true)} />
                </View>
              </>
            ) : null}
            <Hairline />
            <Button label={copy.you.rules} variant="ghost" href="/rules" style={{ marginTop: 12 }} />
          </View>
        </Container>
      </Section>
    </Page>
  );
}
