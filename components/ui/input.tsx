import { View, Text, TextInput, Platform, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography, Fonts } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  containerClassName = '',
  className = '',
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...rest
}: InputProps) {
  const borderColor = error ? Colors.error : Colors.border;

  return (
    <View className={containerClassName}>
      {label && (
        <Text
          style={[
            Typography.caption,
            {
              color: Colors.textMuted,
              marginBottom: Spacing.sm,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          backgroundColor: Colors.surface,
          borderWidth: 1.5,
          borderColor,
          borderRadius: BorderRadius.input,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error || undefined}
          style={[
            Typography.body,
            {
              color: Colors.textBody,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.lg,
            },
          ]}
          placeholderTextColor={Colors.textMuted}
          onFocus={(e) => {
            console.log(`[Input] FOCUS: ${label}`);
            onFocusProp?.(e);
          }}
          onBlur={(e) => {
            console.log(`[Input] BLUR: ${label}`);
            onBlurProp?.(e);
          }}
          {...rest}
        />
      </View>
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
          <Text style={[Typography.caption, { color: Colors.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}
