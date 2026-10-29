import { forwardRef, useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useLight } from '@/theme/LightProvider';
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
  const border = error ? '#FF4D4D' : focused ? light.sun : light.line;
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
          paddingHorizontal: 20,
          borderRadius: 18,
          backgroundColor: light.raised,
          borderWidth: 1.5,
          borderColor: border,
          gap: 4,
        }}
      >
        {prefix ? (
          <T v="title" muted style={{ fontFamily: FONTS.monoSemi }}>
            {prefix}
          </T>
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          aria-labelledby={`${label}-label`}
          placeholderTextColor={light.muted}
          selectionColor={light.sun}
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
              color: light.ink,
              fontFamily: FONTS.textSemi,
              fontSize: 20,
              outlineStyle: 'none',
            } as object,
            style,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <T v="bodyS" color={light.ink} accessibilityLiveRegion="polite">
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
