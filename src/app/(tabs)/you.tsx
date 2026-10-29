import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { isGameError } from '@shared/errors';
import { SESSIONS } from '@shared/schedule';
import type { PlayerStats } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { Icon, type IconName } from '@/components/icons';
import { Float, PopIn } from '@/components/motion/Playful';
import { Avatar } from '@/components/profile/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Container, Page } from '@/components/ui/Page';
import { Chip } from '@/components/ui/bits';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toasts';
import { Segmented, Toggle } from '@/components/ui/Toggle';
import { copy } from '@/copy/en';
import { useChampions } from '@/hooks/useChampions';
import { dayLabel, num, signed } from '@/lib/format';
import { handleProblem, normalizeHandle } from '@/lib/handles';
import { useGame } from '@/stores/game';
import { useSettings, type MotionPref } from '@/stores/settings';
import { usePreviewSheet } from '@/stores/ui';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { FONTS } from '@/theme/typography';

export default function Me() {
  const backend = useBackend();
  const layout = useLayout();
  const light = useLight();
  const profile = useGame((s) => s.profile);
  const day = useGame((s) => s.day);
  const settings = useSettings();
  const openPreview = usePreviewSheet((s) => s.setOpen);
  const { mine: crowns } = useChampions(30);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    void backend.getStats().then(setStats);
  }, [backend, profile?.uid, day?.dayKey]);

  if (!profile) return <Page>{null}</Page>;
  const wide = layout.width >= 900;

  const bubbles: { label: string; value: string; icon: IconName; bg: string }[] = [
    { label: copy.you.games, value: stats ? num(stats.runs) : '—', icon: 'play', bg: '#BFE3FF' },
    { label: copy.you.best, value: stats?.bestScore != null ? signed(stats.bestScore) : '—', icon: 'star', bg: '#FFE7A3' },
    { label: copy.you.crowns, value: stats ? num(stats.crowns) : '—', icon: 'crown', bg: '#FFD3E3' },
  ];

  return (
    <Page>
      <Head>
        <title>{`@${profile.handle} — Meridian`}</title>
      </Head>
      <Container style={{ gap: 16, maxWidth: 1040 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 16 }}>
            <PopIn from={0.85}>
              <Card contentStyle={{ gap: 16, alignItems: 'center' }}>
                <Float amplitude={6}>
                  <View style={{ borderRadius: 80, boxShadow: `0px 6px 0px 0px ${light.shadow}` }}>
                    <Avatar seed={profile.avatarSeed} size={wide ? 140 : 112} ring="#FFFFFF" />
                  </View>
                </Float>
                <View style={{ alignItems: 'center', gap: 4, alignSelf: 'stretch' }}>
                  <T v="l" fit={0.55} align="center" accessibilityRole="header">
                    @{profile.handle}
                  </T>
                  <T v="label" muted align="center">
                    {profile.city ? `${profile.city} · ` : ''}
                    {copy.you.since(dayLabel(profile.createdAt))}
                  </T>
                </View>
                <Button label={copy.you.rename} variant="ink" size="s" iconLeft="you" onPress={() => setEditing(true)} />
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                  {bubbles.map((b, i) => (
                    <PopIn key={b.label} index={i} delay={200} from={0.5} style={{ flex: 1 }}>
                      <View style={{ backgroundColor: b.bg, borderRadius: 20, paddingVertical: 12, alignItems: 'center', gap: 2 }}>
                        <Icon name={b.icon} color="#221B45" size={20} strokeWidth={2.4} filled />
                        <T v="m" fit={0.6} style={{ fontFamily: FONTS.num }}>
                          {b.value}
                        </T>
                        <T v="label" muted style={{ fontSize: 12 }}>
                          {b.label}
                        </T>
                      </View>
                    </PopIn>
                  ))}
                </View>
              </Card>
            </PopIn>

            {crowns.length ? (
              <PopIn index={1}>
                <Card contentStyle={{ gap: 12 }}>
                  <T v="s" accessibilityRole="header">
                    {copy.you.titles}
                  </T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {crowns.map((c) => (
                      <Chip key={c.competitionId} tone="sun" icon="crown">
                        {`${SESSIONS[c.kind].title} · ${dayLabel(c.closesAt)} · ${signed(c.score)}`}
                      </Chip>
                    ))}
                  </View>
                </Card>
              </PopIn>
            ) : null}
          </View>

          <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 16 }}>
            <PopIn index={2}>
              <Card contentStyle={{ gap: 4 }}>
                <T v="m" accessibilityRole="header" style={{ marginBottom: 4 }}>
                  {copy.you.settings}
                </T>
                <Toggle label={copy.you.sound} hint={copy.you.soundHint} value={settings.sound} onChange={settings.setSound} />
                {Platform.OS !== 'web' ? <Toggle label={copy.you.haptics} hint={copy.you.hapticsHint} value={settings.haptics} onChange={settings.setHaptics} /> : null}
                <Toggle label={copy.you.relaxed} hint={copy.you.relaxedHint} value={settings.relaxedPractice} onChange={settings.setRelaxedPractice} />
                <View style={{ paddingVertical: 12, gap: 8 }}>
                  <T v="title">{copy.you.motion}</T>
                  <T v="bodyS" muted>
                    {copy.you.motionHint}
                  </T>
                  <Segmented<MotionPref>
                    label={copy.you.motion}
                    value={settings.motion}
                    onChange={settings.setMotion}
                    stretch
                    options={[
                      { value: 'system', label: 'Auto' },
                      { value: 'reduced', label: 'Less' },
                      { value: 'full', label: 'Full' },
                    ]}
                  />
                </View>
              </Card>
            </PopIn>

            {backend.preview ? (
              <PopIn index={3}>
                <Card contentStyle={{ gap: 10 }}>
                  <T v="s">{copy.you.preview}</T>
                  <T v="bodyS" muted>
                    {copy.you.previewHint}
                  </T>
                  <Button label="Open preview controls" variant="ink" size="m" iconLeft="clock" onPress={() => openPreview(true)} />
                </Card>
              </PopIn>
            ) : null}

            <PopIn index={4}>
              <View style={{ gap: 10, alignItems: 'flex-start' }}>
                <Button label={copy.you.rules} variant="ink" iconLeft="help" href="/rules" />
                <T v="label" muted>
                  {`${copy.you.server}: ${backend.label}`}
                </T>
              </View>
            </PopIn>
          </View>
        </View>
      </Container>
      <Sheet visible={editing} onClose={() => setEditing(false)} title={copy.you.rename}>
        <EditName onDone={() => setEditing(false)} />
      </Sheet>
    </Page>
  );
}

function EditName({ onDone }: { onDone: () => void }) {
  const backend = useBackend();
  const profile = useGame((s) => s.profile)!;
  const setProfile = useGame((s) => s.setProfile);
  const [handle, setHandle] = useState(profile.handle);
  const [city, setCity] = useState(profile.city);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
      onDone();
    } catch (e) {
      setError(isGameError(e) ? e.message : 'Couldn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
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
        hint={copy.welcome.nameHint}
      />
      <Field label={copy.welcome.cityLabel} value={city} onChangeText={setCity} maxLength={24} placeholder={copy.welcome.cityPlaceholder} returnKeyType="done" onSubmitEditing={save} />
      <Button label={copy.you.save} size="l" stretch disabled={!dirty} loading={saving} onPress={save} />
    </View>
  );
}

