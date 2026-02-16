import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'info' | 'watch' | 'urgent' | 'success';
  className?: string;
}

export function Badge({ label, variant = 'primary', className = '' }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    watch: 'bg-warning/10 text-warning',
    urgent: 'bg-error/10 text-error',
    success: 'bg-success/10 text-success',
  };

  const [bgClass, textClass] = variantStyles[variant].split(' ');

  return (
    <View className={`rounded-full px-3 py-1 ${bgClass} ${className}`}>
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </View>
  );
}
