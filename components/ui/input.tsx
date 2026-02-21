import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '@/constants/spacing';

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

  const bgClass = isFocused ? 'bg-surface' : 'bg-surface-muted';
  const borderColor = error
    ? 'border-error'
    : isFocused
    ? 'border-primary'
    : 'border-transparent';

  return (
    <View className={containerClassName}>
      {label && (
        <Text className="text-overline uppercase text-text-secondary mb-2 tracking-wider">
          {label}
        </Text>
      )}
      <View style={isFocused ? Shadows.md : {}}>
        <TextInput
          className={`${bgClass} rounded-xl border ${borderColor} px-4 py-3.5 text-base text-text-primary ${className}`}
          placeholderTextColor="#94A3B8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && (
        <View className="flex-row items-center gap-1.5 mt-1.5">
          <Ionicons name="alert-circle" size={14} color="#EF5350" />
          <Text className="text-sm text-error">{error}</Text>
        </View>
      )}
    </View>
  );
}
