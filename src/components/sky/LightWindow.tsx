import { View } from 'react-native';
import type { LightState } from '@shared/types';
import { LIGHTS } from '@/theme/palette';
import { Grain } from '../ui/bits';
import { T } from '../ui/Text';

/**
 * A framed piece of sky: the light a competition is played in, with the sun
 * where it stands at that hour. Teaches the light system without a word.
 */
export function LightWindow({
  light: name,
  minutes,
  label,
  width,
  height,
  lifted,
}: {
  light: LightState;
  /** minutes from midnight that the window shows */
  minutes: number;
  label: string;
  width: number;
  height: number;
  lifted?: boolean;
}) {
  const light = LIGHTS[name];
  const p = Math.min(1, Math.max(0, (minutes - 300) / (22 * 60 - 300)));
  const sun = Math.round(height * 0.3);
  const horizon = height * 0.78;
  const x = width * 0.12 + p * (width * 0.76) - sun / 2;
  const night = name === 'midnight';
  const y = horizon - sun / 2 - Math.sin(p * Math.PI) * (horizon - sun * 0.9) - (lifted ? 8 : 0);
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: 26,
        overflow: 'hidden',
        backgroundColor: light.field,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <Grain />
      <View style={{ position: 'absolute', left: width / 2 - 0.75, top: 0, bottom: 0, width: 1.5, backgroundColor: light.ink, opacity: 0.25 }} />
      <View
        style={{
          position: 'absolute',
          left: night ? width * 0.66 : x,
          top: night ? height * 0.16 : y,
          width: sun,
          height: sun,
          borderRadius: sun / 2,
          backgroundColor: light.sun,
        }}
      />
      {night ? (
        <View
          style={{
            position: 'absolute',
            left: width * 0.66 + sun * 0.28,
            top: height * 0.16 - sun * 0.08,
            width: sun,
            height: sun,
            borderRadius: sun / 2,
            backgroundColor: light.field,
          }}
        />
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, top: horizon, bottom: 0, backgroundColor: light.deep }} />
      <View style={{ position: 'absolute', left: 16, top: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: light.sun }} />
        <T v="label" color={light.ink} style={{ fontSize: 10 }}>
          {label}
        </T>
      </View>
    </View>
  );
}
