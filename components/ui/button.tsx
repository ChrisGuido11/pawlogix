import { Pressable, ActivityIndicator, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const baseStyles = 'rounded-lg py-3.5 px-6 flex-row items-center justify-center';
  const variantStyles = {
    primary: isDisabled ? 'bg-disabled' : 'bg-primary',
    secondary: isDisabled ? 'border border-disabled' : 'border border-primary',
    destructive: isDisabled ? 'bg-disabled' : 'bg-error',
    ghost: '',
  };
  const textStyles = {
    primary: isDisabled ? 'text-text-secondary' : 'text-white',
    secondary: isDisabled ? 'text-text-secondary' : 'text-primary',
    destructive: isDisabled ? 'text-text-secondary' : 'text-white',
    ghost: isDisabled ? 'text-text-secondary' : 'text-primary',
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? '#0D7377' : '#FFFFFF'}
          size="small"
        />
      ) : (
        <Text className={`text-base font-semibold ${textStyles[variant]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
