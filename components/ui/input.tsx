import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BorderRadius } from '@/constants/spacing';

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
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Spec: bg-surface (#FFFFFF), 1.5px solid border (#EAEAEA), radius 14px
  // Focus: border-primary, blue focus ring shadow
  // Error: border-error, error text below
  const borderColor = error
    ? Colors.error
    : isFocused
      ? Colors.primary
      : Colors.border;

  const focusRingShadow = isFocused && !error
    ? {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 0,
      }
    : {};

  return (
    <View className={containerClassName}>
      {label && (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: Colors.textMuted,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          {
            backgroundColor: Colors.surface,
            borderWidth: 1.5,
            borderColor,
            borderRadius: BorderRadius.input, // 14px
          },
          focusRingShadow,
        ]}
      >
        <TextInput
          style={{
            fontSize: 15,
            color: Colors.textBody,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
          <Text style={{ fontSize: 12, color: Colors.error }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
