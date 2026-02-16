import { View, Pressable } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  className?: string;
}

export function Card({ children, onPress, selected = false, className = '' }: CardProps) {
  const baseStyles = 'bg-surface rounded-xl shadow-sm p-4';
  const borderStyles = selected ? 'border-2 border-primary' : 'border border-border';

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${baseStyles} ${borderStyles} ${className}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`${baseStyles} ${borderStyles} ${className}`}>
      {children}
    </View>
  );
}
