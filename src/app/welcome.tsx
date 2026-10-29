import { Redirect, router } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGameError } from '@shared/errors';
import { useBackend } from '@/backend/BackendProvider';
import { Icon } from '@/components/icons';
import { WordsReveal } from '@/components/motion/Kinetic';
import { SunDisc } from '@/components/sky/SunDisc';
import { Eyebrow, Grain } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Tap } from '@/components/ui/Tap';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { handleProblem, normalizeHandle, suggestHandle } from '@/lib/handles';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { ease } from '@/theme/motion';

export default function Welcome() {
  const backend = useBackend();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  const light = useLight();
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const [handle, setHandle] = useState(() => suggestHandle());
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cityRef = useRef<TextInputInstance>(null);

  const rise = useSharedValue(0);
  const line = useSharedValue(0);
  useEffect(() => {
    rise.value = withTiming(1, { duration: 1600, easing: ease.out });
    line.value = withDelay(500, withTiming(1, { duration: 1400, easing: ease.out }));
  }, [line, rise]);
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - rise.value) * 260 }], opacity: 0.2 + rise.value * 0.8 }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: line.value }] }));

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

  const wide = !layout.isPhone;
  const sunSize = wide ? Math.min(layout.width * 0.42, 620) : Math.min(layout.width * 0.78, 360);

  return (
    <View style={{ flex: 1, backgroundColor: light.field, overflow: 'hidden' }} role="main">
      <Head>
        <title>Meridian — Win the day</title>
        <meta name="description" content={copy.meta.description} />
      </Head>
      <Grain />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: wide ? -sunSize * 0.18 : -sunSize * 0.3,
          top: wide ? layout.height * 0.18 : insets.top - sunSize * 0.28,
          width: sunSize,
          height: sunSize,
        }}
      >
        <Animated.View style={sunStyle}>
          <SunDisc size={sunSize} color={light.sun} sky={light.field} glow={light.glow} />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: sunSize / 2 - 1.5,
              top: -sunSize * 0.3,
              width: 3,
              height: sunSize * (wide ? 1.6 : 1.22),
              backgroundColor: light.ink,
              transformOrigin: 'top',
            },
            lineStyle,
          ]}
        />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: wide ? 'center' : 'flex-end',
            paddingHorizontal: layout.gutter,
            paddingTop: insets.top + (wide ? 64 : sunSize * 0.5),
            paddingBottom: insets.bottom + 40,
          }}
        >
          <View style={{ maxWidth: wide ? Math.min(640, layout.width * 0.5) : undefined, gap: 28 }}>
            <Eyebrow>{copy.welcome.eyebrow}</Eyebrow>
            <WordsReveal text={copy.welcome.title} style={layout.type.hero} color={light.ink} delay={250} />
            <T v="bodyL" muted style={{ maxWidth: 520 }}>
              {copy.welcome.body}
            </T>
            <View style={{ gap: 18, maxWidth: 520 }}>
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
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
                error={error}
                hint={copy.welcome.nameHint}
                trailing={
                  <Tap
                    onPress={() => {
                      setHandle(suggestHandle());
                      setError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={copy.welcome.shuffle}
                    style={({ hovered }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: hovered ? light.deep : 'transparent',
                    })}
                  >
                    <Icon name="reset" color={light.ink} size={20} />
                  </Tap>
                }
              />
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
            </View>
            <View style={{ gap: 14 }}>
              <Button label={copy.welcome.cta} onPress={submit} loading={saving} />
              <T v="label" muted>
                {copy.welcome.rulesLine}
              </T>
              {backend.kind === 'mock' ? (
                <T v="bodyS" muted>
                  {copy.welcome.mockNote}
                </T>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
