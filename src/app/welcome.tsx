import { Redirect, router } from 'expo-router';
import Head from 'expo-router/head';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGameError } from '@shared/errors';
import { useBackend } from '@/backend/BackendProvider';
import { Sunny, type Mood } from '@/components/brand/Sunny';
import { Icon } from '@/components/icons';
import { Float, PopIn, Wiggle } from '@/components/motion/Playful';
import { WorldBackdrop } from '@/components/sky/World';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { handleProblem, normalizeHandle, suggestHandle } from '@/lib/handles';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { SIGNAL, TILES } from '@/theme/palette';
import { FONTS } from '@/theme/typography';

/** Hello, three things to know, then a name. Anyone can be playing in under a minute. */
const STEPS = 5;

export default function Welcome() {
  const backend = useBackend();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(() => suggestHandle());
  const [rolls, setRolls] = useState(0);
  const [city, setCity] = useState('');
  const [withCity, setWithCity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cityRef = useRef<TextInputInstance>(null);

  if (profile) return <Redirect href="/" />;

  const submit = async () => {
    const normalized = normalizeHandle(handle);
    const problem = handleProblem(normalized);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const saved = await backend.saveProfile({ handle: normalized, city });
      setProfile(saved);
      router.replace('/');
    } catch (e) {
      setError(isGameError(e) ? e.message : 'Couldn’t save your name. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const moods: Mood[] = ['happy', 'wow', 'happy', 'proud', 'happy'];
  const last = step === STEPS - 1;

  return (
    <View style={{ flex: 1 }} role="main">
      <Head>
        <title>Meridian — trivia for everyone</title>
        <meta name="description" content={copy.meta.description} />
      </Head>
      <WorldBackdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: layout.gutter,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 28,
          }}
        >
          <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
              {step > 0 ? (
                <IconButton icon="arrow-left" onPress={() => setStep((s) => s - 1)} accessibilityLabel="Back" />
              ) : (
                <View style={{ width: 44 }} />
              )}
              <Dots step={step} />
              {step > 0 && !last ? (
                <Button label="Skip" variant="ghost" size="s" onPress={() => setStep(STEPS - 1)} accessibilityHint="Go straight to choosing a name" />
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>

            <View style={{ alignItems: 'center' }}>
              <Float amplitude={8}>
                <Sunny size={step === 0 ? 170 : 120} mood={moods[step]} />
              </Float>
            </View>

            <PopIn key={step} from={0.85}>
              {step === 0 ? (
                <Card contentStyle={{ gap: 14, alignItems: 'center' }}>
                  <T v="xl" align="center" accessibilityRole="header">
                    {copy.welcome.hello}
                  </T>
                  <T v="bodyL" muted align="center">
                    {copy.welcome.tagline}
                  </T>
                  <Button label={copy.welcome.letsGo} size="xl" stretch idle="pulse" icon="arrow-right" onPress={() => setStep(1)} />
                </Card>
              ) : step < 4 ? (
                <HowStep index={step - 1} onNext={() => setStep(step + 1)} />
              ) : (
                <Card contentStyle={{ gap: 16 }}>
                  <T v="l" accessibilityRole="header">
                    {copy.welcome.nameTitle}
                  </T>
                  <T v="body" muted>
                    {copy.welcome.nameBody}
                  </T>
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
                    autoComplete="username"
                    maxLength={16}
                    returnKeyType={withCity ? 'next' : 'go'}
                    onSubmitEditing={() => (withCity ? cityRef.current?.focus() : void submit())}
                    error={error}
                    hint={copy.welcome.nameHint}
                    trailing={
                      <Wiggle trigger={rolls} angle={14}>
                        <IconButton
                          icon="dice"
                          size={40}
                          onPress={() => {
                            setHandle(suggestHandle());
                            setRolls((n) => n + 1);
                            setError(null);
                          }}
                          accessibilityLabel={copy.welcome.shuffle}
                          colors={{ bg: '#FFC83D', fg: '#3D2500', lip: '#B87800' }}
                        />
                      </Wiggle>
                    }
                  />
                  {withCity ? (
                    <Field
                      ref={cityRef}
                      label={copy.welcome.cityLabel}
                      value={city}
                      onChangeText={setCity}
                      placeholder={copy.welcome.cityPlaceholder}
                      maxLength={24}
                      returnKeyType="go"
                      onSubmitEditing={submit}
                    />
                  ) : (
                    <Button label={copy.welcome.addCity} variant="ghost" size="s" iconLeft="you" onPress={() => setWithCity(true)} />
                  )}
                  <Button label={copy.welcome.cta} size="xl" stretch iconLeft="play" idle="pulse" onPress={submit} loading={saving} />
                  {backend.kind === 'mock' ? (
                    <T v="bodyS" muted align="center">
                      {copy.welcome.mockNote}
                    </T>
                  ) : null}
                </Card>
              )}
            </PopIn>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Dots({ step }: { step: number }) {
  const light = useLight();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? light.sun : 'rgba(255, 255, 255, 0.55)' }} />
      ))}
    </View>
  );
}

/** One thing to know, with a picture of it. */
function HowStep({ index, onNext }: { index: number; onNext: () => void }) {
  const step = copy.welcome.steps[index];
  return (
    <Card contentStyle={{ gap: 18, alignItems: 'center' }}>
      <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>{index === 0 ? <ClockPicture /> : index === 1 ? <TilesPicture /> : <PointsPicture />}</View>
      <T v="l" align="center" accessibilityRole="header">
        {step.title}
      </T>
      <T v="bodyL" muted align="center">
        {step.text}
      </T>
      <Button label={index === 2 ? 'Got it!' : 'Next'} size="l" stretch icon="arrow-right" onPress={onNext} />
    </Card>
  );
}

function ClockPicture() {
  return (
    <Float amplitude={4} rotate={4}>
      <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: '#4FB8FF', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 6px 0px 0px #2A7FC4' }}>
        <Icon name="clock" color="#FFFFFF" size={56} strokeWidth={2.6} />
        <T v="label" color="#FFFFFF" style={{ position: 'absolute', bottom: 10, fontFamily: FONTS.display, fontSize: 18 }}>
          60s
        </T>
      </View>
    </Float>
  );
}

function TilesPicture() {
  return (
    <View style={{ gap: 6, width: 220 }}>
      {TILES.slice(0, 3).map((tile, i) => (
        <PopIn key={i} index={i} delay={150} from={0.6}>
          <View
            style={{
              height: 32,
              borderRadius: 12,
              backgroundColor: i === 1 ? SIGNAL.correct : tile.bg,
              boxShadow: `0px 4px 0px 0px ${i === 1 ? SIGNAL.correctLip : tile.lip}`,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              gap: 8,
            }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              {i === 1 ? <Icon name="check" color={SIGNAL.correctLip} size={14} strokeWidth={3.4} /> : null}
            </View>
            <View style={{ height: 8, width: 90 + i * 20, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.6)' }} />
          </View>
        </PopIn>
      ))}
    </View>
  );
}

function PointsPicture() {
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <Float amplitude={5} delay={0}>
        <Bubble text="+3" bg={SIGNAL.correct} fg={SIGNAL.onCorrect} lip={SIGNAL.correctLip} />
      </Float>
      <Float amplitude={5} delay={500}>
        <Bubble text="−1" bg={SIGNAL.wrong} fg={SIGNAL.onWrong} lip={SIGNAL.wrongLip} />
      </Float>
      <Float amplitude={5} delay={1000}>
        <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFC83D', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 5px 0px 0px #B87800' }}>
          <Icon name="crown" color="#3D2500" size={34} strokeWidth={2.4} filled />
        </View>
      </Float>
    </View>
  );
}

function Bubble({ text, bg, fg, lip }: { text: string; bg: string; fg: string; lip: string }) {
  return (
    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 5px 0px 0px ${lip}` }}>
      <T v="l" color={fg} style={{ fontFamily: FONTS.display }}>
        {text}
      </T>
    </View>
  );
}
