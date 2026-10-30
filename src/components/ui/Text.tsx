import { Children, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { glyphRoom, type TypeVariant } from '@/theme/typography';
import { fitProps, useFitText } from './fit';

export interface TProps extends TextProps {
  v?: TypeVariant;
  color?: string;
  muted?: boolean;
  align?: 'left' | 'center' | 'right';
  upper?: boolean;
  size?: number;
  /** Keep to one line and shrink to fit (down to this fraction of the size) rather than cut a name or number short. */
  fit?: number;
}

export const plainText = (children: ReactNode): string =>
  Children.toArray(children)
    .filter((c) => typeof c === 'string' || typeof c === 'number')
    .join('');

/** Every piece of text in Glint! goes through here, so the type scale stays one system. */
export function T({ v = 'body', color, muted, align, upper, size, fit, style, children, ...rest }: TProps) {
  const { type } = useLayout();
  const light = useLight();
  const base = type[v];
  const flat = StyleSheet.flatten([
    base,
    { color: color ?? (muted ? light.muted : light.ink) },
    size ? { fontSize: size, lineHeight: Math.round(size * ((base.lineHeight as number) / (base.fontSize as number))) } : null,
    align ? { textAlign: align } : null,
    upper ? { textTransform: 'uppercase' } : null,
    style,
  ]);
  const fitRef = useFitText<ComponentRef<typeof Text>>(fit, flat, plainText(children));
  return (
    <Text ref={fitRef} {...rest} {...fitProps(fit)} style={[flat, glyphRoom(flat)]}>
      {children}
    </Text>
  );
}
