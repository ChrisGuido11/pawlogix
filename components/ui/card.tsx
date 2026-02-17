import { View, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  className?: string;
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: {
    elevation: 2,
  },
  default: {},
});

export function Card({ children, onPress, selected = false, className = '' }: CardProps) {
  const baseStyles = 'bg-surface rounded-xl p-4';
  const borderStyles = selected ? 'border-2 border-primary' : 'border border-border';

  if (onPress) {
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    };

    return (
      <Pressable
        onPress={handlePress}
        className={`${baseStyles} ${borderStyles} ${className}`}
        style={({ pressed }) => [cardShadow, { opacity: pressed ? 0.95 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`${baseStyles} ${borderStyles} ${className}`} style={cardShadow}>
      {children}
    </View>
  );
}
