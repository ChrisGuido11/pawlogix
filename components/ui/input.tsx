import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { useState } from 'react';

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

  const borderColor = error
    ? 'border-error'
    : isFocused
    ? 'border-primary'
    : 'border-border';

  return (
    <View className={containerClassName}>
      {label && (
        <Text className="text-sm font-medium text-text-primary mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        className={`bg-surface rounded-lg border ${borderColor} px-4 py-3 text-base text-text-primary ${className}`}
        placeholderTextColor="#64748B"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && (
        <Text className="text-sm text-error mt-1">{error}</Text>
      )}
    </View>
  );
}
