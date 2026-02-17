import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'info' | 'watch' | 'urgent' | 'success';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ label, variant = 'primary', size = 'md', className = '' }: BadgeProps) {
  const variantStyles = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    info: { bg: 'bg-info/10', text: 'text-info' },
    watch: { bg: 'bg-warning/10', text: 'text-warning' },
    urgent: { bg: 'bg-error/10', text: 'text-error' },
    success: { bg: 'bg-success/10', text: 'text-success' },
  };

  const sizeStyles = {
    sm: { container: 'px-2 py-0.5', text: 'text-[10px]' },
    md: { container: 'px-3 py-1', text: 'text-xs' },
  };

  const { bg, text } = variantStyles[variant];
  const { container, text: textSize } = sizeStyles[size];

  return (
    <View className={`rounded-full ${container} ${bg} ${className}`} style={{ minWidth: 28 }}>
      <Text className={`${textSize} font-medium ${text} text-center`}>{label}</Text>
    </View>
  );
}
