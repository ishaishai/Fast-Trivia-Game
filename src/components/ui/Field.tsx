import { forwardRef, useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { onCard, useLight } from '@/theme/LightProvider';
import { SIGNAL } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { T } from './Text';

interface FieldProps extends TextInputProps {
  label: string;
  prefix?: string;
  error?: string | null;
  hint?: string;
  trailing?: ReactNode;
}

/** A labelled text field. The label stays visible; errors say what to do. */
export const Field = forwardRef<TextInputInstance, FieldProps>(function Field(
  { label, prefix, error, hint, trailing, style, onFocus, onBlur, ...rest },
  ref,
) {
  const light = useLight();
  const [focused, setFocused] = useState(false);
  const border = error ? SIGNAL.wrong : focused ? light.card.sunText : 'transparent';
  return (
    <View style={{ gap: 8 }}>
      <T v="label" muted nativeID={`${label}-label`}>
        {label}
      </T>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 60,
          paddingHorizontal: 18,
          borderRadius: 18,
          backgroundColor: onCard(light) ? light.deep : '#FFFFFF',
          borderWidth: 3,
          borderColor: border,
          gap: 4,
        }}
      >
        {prefix ? (
          <T v="title" muted style={{ fontFamily: FONTS.display, fontSize: 20 }}>
            {prefix}
          </T>
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          aria-labelledby={`${label}-label`}
          placeholderTextColor={light.card.muted}
          selectionColor={light.card.sunText}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              height: '100%',
              color: light.card.ink,
              fontFamily: FONTS.displaySemi,
              fontSize: 20,
              outlineStyle: 'none',
            } as object,
            style,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <T v="bodyS" color={SIGNAL.wrongLip} accessibilityLiveRegion="polite">
          ✕ {error}
        </T>
      ) : hint ? (
        <T v="bodyS" muted>
          {hint}
        </T>
      ) : null}
    </View>
  );
});
