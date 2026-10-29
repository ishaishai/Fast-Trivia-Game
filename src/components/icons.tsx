import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'today'
  | 'standings'
  | 'crown'
  | 'you'
  | 'rules'
  | 'arrow-right'
  | 'arrow-left'
  | 'up'
  | 'down'
  | 'close'
  | 'check'
  | 'cross'
  | 'skip'
  | 'sound'
  | 'mute'
  | 'share'
  | 'copy'
  | 'clock'
  | 'lock'
  | 'warp'
  | 'reset'
  | 'play'
  | 'star'
  | 'trophy'
  | 'podium'
  | 'fire'
  | 'dice'
  | 'chevron-down'
  | 'chevron-right'
  | 'sparkle'
  | 'help'
  | 'gear'
  | 'bolt';

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** fill the shape as well as stroking it (star, play, trophy…) */
  filled?: boolean;
}

/** A 24-unit, round-capped, chunky icon set drawn for Meridian. */
export function Icon({ name, size = 22, color, strokeWidth = 2.2, filled }: IconProps) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const f = filled ? { ...p, fill: color } : p;
  return (
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' && (
        <>
          <Path d="M5 16a7 7 0 0 1 14 0" {...p} />
          <Line x1="2.5" y1="19" x2="21.5" y2="19" {...p} />
          <Line x1="12" y1="3" x2="12" y2="6" {...p} />
        </>
      )}
      {name === 'standings' && (
        <>
          <Line x1="4" y1="6" x2="20" y2="6" {...p} />
          <Line x1="4" y1="12" x2="16" y2="12" {...p} />
          <Line x1="4" y1="18" x2="11" y2="18" {...p} />
        </>
      )}
      {name === 'crown' && (
        <>
          <Path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z" {...p} />
          <Line x1="5" y1="20.5" x2="19" y2="20.5" {...p} />
        </>
      )}
      {name === 'you' && (
        <>
          <Circle cx="12" cy="8.5" r="4" {...p} />
          <Path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" {...p} />
        </>
      )}
      {name === 'rules' && (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Polyline points="12,7 12,12 15.5,14" {...p} />
        </>
      )}
      {name === 'arrow-right' && (
        <>
          <Line x1="4" y1="12" x2="19" y2="12" {...p} />
          <Polyline points="13,6 19,12 13,18" {...p} />
        </>
      )}
      {name === 'arrow-left' && (
        <>
          <Line x1="20" y1="12" x2="5" y2="12" {...p} />
          <Polyline points="11,6 5,12 11,18" {...p} />
        </>
      )}
      {name === 'up' && <Polyline points="6,15 12,9 18,15" {...p} />}
      {name === 'down' && <Polyline points="6,9 12,15 18,9" {...p} />}
      {name === 'close' && (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...p} />
          <Line x1="18" y1="6" x2="6" y2="18" {...p} />
        </>
      )}
      {name === 'check' && <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" {...p} />}
      {name === 'cross' && (
        <>
          <Line x1="6.5" y1="6.5" x2="17.5" y2="17.5" {...p} />
          <Line x1="17.5" y1="6.5" x2="6.5" y2="17.5" {...p} />
        </>
      )}
      {name === 'skip' && (
        <>
          <Polyline points="5,6 11,12 5,18" {...p} />
          <Polyline points="12,6 18,12 12,18" {...p} />
        </>
      )}
      {(name === 'sound' || name === 'mute') && (
        <>
          <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" {...p} />
          {name === 'sound' ? (
            <>
              <Path d="M15.5 9a4 4 0 0 1 0 6" {...p} />
              <Path d="M18 6.5a7.5 7.5 0 0 1 0 11" {...p} />
            </>
          ) : (
            <>
              <Line x1="16" y1="9.5" x2="21" y2="14.5" {...p} />
              <Line x1="21" y1="9.5" x2="16" y2="14.5" {...p} />
            </>
          )}
        </>
      )}
      {name === 'share' && (
        <>
          <Path d="M12 3.5v11" {...p} />
          <Polyline points="7.5,8 12,3.5 16.5,8" {...p} />
          <Path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...p} />
        </>
      )}
      {name === 'copy' && (
        <>
          <Rect x="8" y="8" width="12" height="12" rx="2.5" {...p} />
          <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" {...p} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Polyline points="12,7.5 12,12 15,13.5" {...p} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="5" y="10.5" width="14" height="10" rx="2.5" {...p} />
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} />
        </>
      )}
      {name === 'warp' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Polyline points="12,7 12,12" {...p} />
          <Polyline points="16,5 19,8 22,5" {...p} />
        </>
      )}
      {name === 'reset' && (
        <>
          <Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" {...p} />
          <Polyline points="4,4 4.5,8 8.5,7.5" {...p} />
        </>
      )}
      {name === 'play' && <Path d="M8 5.5v13l10.5-6.5z" {...f} />}
      {name === 'star' && <Path d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7z" {...f} />}
      {name === 'trophy' && (
        <>
          <Path d="M7 4h10v5a5 5 0 0 1-10 0z" {...f} />
          <Path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.6M17 6h2.5a2.5 2.5 0 0 1-2.6 3.6" {...p} />
          <Line x1="12" y1="14" x2="12" y2="17.5" {...p} />
          <Path d="M8.5 20.5h7l-.8-3h-5.4z" {...f} />
        </>
      )}
      {name === 'podium' && (
        <>
          <Rect x="9" y="5" width="6" height="15" rx="1.5" {...f} />
          <Rect x="3" y="10" width="6" height="10" rx="1.5" {...p} />
          <Rect x="15" y="13" width="6" height="7" rx="1.5" {...p} />
        </>
      )}
      {name === 'fire' && <Path d="M12 21c-4 0-6.5-2.8-6.5-6.3 0-3.7 3-5.6 3.6-9.2 2.3 1.4 3.4 3.6 3.4 5.6 1-.7 1.6-1.9 1.7-3.2 2.5 2 4.3 4.5 4.3 7 0 3.4-2.5 6.1-6.5 6.1z" {...f} />}
      {name === 'dice' && (
        <>
          <Rect x="4" y="4" width="16" height="16" rx="4" {...p} />
          <Circle cx="9" cy="9" r="1.3" fill={color} />
          <Circle cx="15" cy="15" r="1.3" fill={color} />
          <Circle cx="15" cy="9" r="1.3" fill={color} />
          <Circle cx="9" cy="15" r="1.3" fill={color} />
        </>
      )}
      {name === 'chevron-down' && <Polyline points="6,9.5 12,15.5 18,9.5" {...p} />}
      {name === 'chevron-right' && <Polyline points="9.5,6 15.5,12 9.5,18" {...p} />}
      {name === 'sparkle' && <Path d="M12 3c.8 5 2.2 7 7 8-4.8 1-6.2 3-7 8-.8-5-2.2-7-7-8 4.8-1 6.2-3 7-8z" {...f} />}
      {name === 'help' && (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.6" {...p} />
          <Circle cx="12" cy="16.8" r="1.1" fill={color} />
        </>
      )}
      {name === 'gear' && (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" {...p} />
        </>
      )}
      {name === 'bolt' && <Path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12z" {...f} />}
    </Svg>
    </View>
  );
}
