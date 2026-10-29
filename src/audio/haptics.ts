import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettings } from '@/stores/settings';

export type HapticKind = 'select' | 'light' | 'heavy' | 'success' | 'error' | 'warning';

/** Touch feedback on phones; silently nothing on the web. */
export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web' || !useSettings.getState().haptics) return;
  try {
    switch (kind) {
      case 'select':
        void Haptics.selectionAsync();
        break;
      case 'light':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
    // Haptics are a nicety; never let them break play.
  }
}
