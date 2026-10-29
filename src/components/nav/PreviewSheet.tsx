import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SESSIONS } from '@shared/schedule';
import type { LightState } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { useNow } from '@/hooks/useNow';
import { clockParts, clockTime, dayLabel, humanDuration } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useSettings } from '@/stores/settings';
import { usePreviewSheet } from '@/stores/ui';
import { Icon, type IconName } from '../icons';
import { Hairline } from '../ui/bits';
import { Sheet } from '../ui/Sheet';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';
import { toast } from '../ui/Toasts';
import { Segmented } from '../ui/Toggle';
import { useLight } from '@/theme/LightProvider';

const LIGHT_OPTIONS: { value: LightState | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'firstlight', label: 'Morning' },
  { value: 'zenith', label: 'Day' },
  { value: 'bluehour', label: 'Evening' },
  { value: 'midnight', label: 'Night' },
];

/**
 * Offline preview only. Moves the mock server's clock so a reviewer can see
 * doors open and crowns land at any hour, without waiting for the real one.
 */
export function PreviewSheet() {
  const backend = useBackend();
  const open = usePreviewSheet((s) => s.open);
  const setOpen = usePreviewSheet((s) => s.setOpen);
  const preview = backend.preview;
  if (!preview) return null;
  return (
    <Sheet visible={open} onClose={() => setOpen(false)} title="Time machine">
      {open ? <Controls close={() => setOpen(false)} /> : null}
    </Sheet>
  );
}

function Controls({ close }: { close: () => void }) {
  const backend = useBackend();
  const preview = backend.preview!;
  const light = useLight();
  const now = useNow(1000);
  const activeRun = useGame((s) => s.day?.activeRun);
  const lightOverride = useSettings((s) => s.lightOverride);
  const setLightOverride = useSettings((s) => s.setLightOverride);
  const [busy, setBusy] = useState(false);
  const offset = preview.warpOffset();
  const opening = preview.nextOpening();
  const crowning = preview.nextCrowning();
  const t = clockParts(now);
  const locked = Boolean(activeRun);

  const jump = (at: number, label: string) => {
    preview.warpTo(at - 5000);
    toast(`Clock moved: ${label} in 5 seconds.`);
    close();
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 4 }}>
        <T v="label" muted>
          Mock server clock
        </T>
        <T v="m">
          {dayLabel(now)} · {t.hh}:{t.mm}:{t.ss}
        </T>
        <T v="bodyS" muted>
          {offset === 0 ? 'Running on real time.' : `${offset > 0 ? 'Ahead of' : 'Behind'} real time by ${humanDuration(Math.abs(offset))}.`}
        </T>
      </View>

      {locked ? (
        <T v="bodyS" color={light.sunText}>
          Finish your game before moving the clock.
        </T>
      ) : null}

      <View style={{ gap: 8 }}>
        {opening ? (
          <Row
            icon="warp"
            label="Jump to the next doors-open"
            detail={`${SESSIONS[opening.competition.kind].title} · ${clockTime(opening.at)} ${dayLabel(opening.at)}`}
            disabled={locked}
            onPress={() => jump(opening.at, `${SESSIONS[opening.competition.kind].title} opens`)}
          />
        ) : null}
        {crowning ? (
          <Row
            icon="crown"
            label="Jump to the next crowning"
            detail={`${SESSIONS[crowning.competition.kind].title} · ${clockTime(crowning.at)} ${dayLabel(crowning.at)}`}
            disabled={locked}
            onPress={() => jump(crowning.at, `${SESSIONS[crowning.competition.kind].title} is crowned`)}
          />
        ) : null}
        <Row icon="clock" label="Forward one hour" detail="Rivals keep playing while you skip ahead." disabled={locked} onPress={() => preview.warpBy(3_600_000)} />
        <Row icon="reset" label="Back to real time" detail="Undo every jump." disabled={locked || offset === 0} onPress={() => preview.resetWarp()} />
      </View>

      <Hairline />
      <View style={{ gap: 10 }}>
        <T v="label" muted>
          Light
        </T>
        <Segmented
          label="Light"
          scroll
          options={LIGHT_OPTIONS}
          value={lightOverride ?? 'auto'}
          onChange={(v) => setLightOverride(v === 'auto' ? null : v)}
        />
      </View>

      <Hairline />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <SmallAction
          label="Reset today’s runs"
          disabled={busy || locked}
          onPress={async () => {
            setBusy(true);
            await preview.resetToday();
            setBusy(false);
            toast('Today is fresh: runs, registrations and skips cleared.');
          }}
        />
        <SmallAction
          label="Start over"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await preview.resetAll();
            useGame.getState().setProfile(null);
            setBusy(false);
            close();
            router.replace('/welcome');
          }}
        />
      </View>
      <T v="bodyS" muted>
        These controls exist only in the offline preview build.
      </T>
    </View>
  );
}

function Row({ icon, label, detail, onPress, disabled }: { icon: IconName; label: string; detail: string; onPress: () => void; disabled?: boolean }) {
  const light = useLight();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      style={({ hovered }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: hovered ? light.deep : 'transparent',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: light.sun, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={light.onSun} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="title">{label}</T>
        <T v="bodyS" muted>
          {detail}
        </T>
      </View>
    </Tap>
  );
}

function SmallAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const light = useLight();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ hovered }) => ({
        height: 38,
        paddingHorizontal: 16,
        borderRadius: 999,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: hovered ? light.ink : light.line,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <T v="label">{label}</T>
    </Tap>
  );
}
