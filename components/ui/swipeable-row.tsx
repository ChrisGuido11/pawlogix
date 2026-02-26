import React, { useRef } from 'react';
import { Alert, Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface SwipeableRowProps {
  onDelete: () => void | Promise<void>;
  children: React.ReactNode;
  enabled?: boolean;
}

function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = 0.6 + progress.value * 0.4;
    const opacity = progress.value;
    return { transform: [{ scale }], opacity };
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: BorderRadius.button,
            backgroundColor: Colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <Ionicons name="trash-outline" size={22} color={Colors.textOnPrimary} />
      </Animated.View>
    </Pressable>
  );
}

export function SwipeableRow({ onDelete, children, enabled = true }: SwipeableRowProps) {
  const swipeableRef = useRef<any>(null);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();

    Alert.alert(
      'Delete Record',
      'This will permanently delete this record and all associated data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(),
        },
      ]
    );
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      overshootFriction={8}
      renderRightActions={(_progress, drag) => (
        <DeleteAction progress={_progress} onPress={handleDelete} />
      )}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      containerStyle={{ overflow: 'visible' }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
