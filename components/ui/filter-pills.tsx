import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';

interface FilterPillsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  className?: string;
}

export function FilterPills({
  options,
  selected,
  onSelect,
  className = '',
}: FilterPillsProps) {
  const [pillLayouts, setPillLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const initialized = useRef(false);

  // When selected changes or layouts update, animate the indicator
  useEffect(() => {
    const layout = pillLayouts[selected];
    if (layout) {
      if (!initialized.current) {
        // First render: snap immediately
        indicatorX.value = layout.x;
        indicatorWidth.value = layout.width;
        initialized.current = true;
      } else {
        indicatorX.value = withSpring(layout.x, {
          damping: 20,
          stiffness: 300,
        });
        indicatorWidth.value = withSpring(layout.width, {
          damping: 20,
          stiffness: 300,
        });
      }
    }
  }, [selected, pillLayouts]);

  const indicatorStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: indicatorX.value,
    width: indicatorWidth.value,
    height: '100%',
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
  }));

  const handleLayout = useCallback(
    (option: string, x: number, width: number) => {
      setPillLayouts((prev) => ({
        ...prev,
        [option]: { x, width },
      }));
    },
    []
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
      className={className}
    >
      <View
        style={{
          flexDirection: 'row',
          position: 'relative',
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: BorderRadius.pill,
          padding: 3,
        }}
      >
        {/* Animated active indicator */}
        <Animated.View
          style={[
            indicatorStyle,
            Shadows.md,
          ]}
        />
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              handleLayout(option, x, width);
            }}
            accessibilityRole="tab"
            accessibilityLabel={option}
            accessibilityState={{ selected: selected === option }}
            style={{
              paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.lg,
              borderRadius: BorderRadius.pill,
            }}
          >
            <Text
              style={[
                Typography.secondary,
                {
                  fontFamily: selected === option ? Fonts.bold : Fonts.medium,
                  color: selected === option ? Colors.primary : 'rgba(255,255,255,0.85)',
                },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
