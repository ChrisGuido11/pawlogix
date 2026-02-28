import { View, Text, Pressable, Keyboard, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --- Animated Tab Icon with cross-fade ---
function AnimatedTabIcon({
  iconOutline,
  iconFilled,
  isFocused,
  size = 24,
}: {
  iconOutline: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  size?: number;
}) {
  const filledOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    filledOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 150 });
  }, [isFocused]);

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: 1 - filledOpacity.value,
  }));

  const filledStyle = useAnimatedStyle(() => ({
    opacity: filledOpacity.value,
  }));

  const color = isFocused ? Colors.primary : Colors.tabInactive;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute' }, outlineStyle]}>
        <Ionicons name={iconOutline} size={size} color={color} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, filledStyle]}>
        <Ionicons name={iconFilled} size={size} color={color} />
      </Animated.View>
    </View>
  );
}

// --- Tab configuration ---
const TAB_CONFIG = [
  {
    name: 'index',
    label: 'Home',
    iconOutline: 'home-outline' as const,
    iconFilled: 'home' as const,
  },
  {
    name: 'scan', // Special elevated button
    label: 'Scan',
    iconOutline: 'camera-outline' as const,
    iconFilled: 'camera' as const,
  },
  {
    name: 'profile',
    label: 'Settings',
    iconOutline: 'person-outline' as const,
    iconFilled: 'person' as const,
  },
];

// --- Elevated Scan Button ---
function ScanButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      accessibilityLabel="Scan new record"
      accessibilityRole="button"
      style={[
        animStyle,
        Shadows.scanButton,
        {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: Colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -24,
        },
      ]}
    >
      <Ionicons name="camera" size={24} color={Colors.textOnPrimary} />
    </AnimatedPressable>
  );
}

// --- Custom Tab Bar ---
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View
      style={[
        Shadows.tabBar,
        {
          flexDirection: 'row',
          backgroundColor: Colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: Colors.tabBarBorder,
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
          alignItems: 'flex-end',
        },
      ]}
    >
      {TAB_CONFIG.map((tab, index) => {
        // The scan button is special — it routes to /record/scan, not a tab
        if (tab.name === 'scan') {
          return (
            <View key="scan" style={{ flex: 1, alignItems: 'center' }}>
              <ScanButton onPress={() => router.push('/record/scan')} />
              <Text
                style={{
                  ...Typography.tabLabel,
                  color: Colors.primary,
                  marginTop: 2,
                }}
              >
                {tab.label}
              </Text>
            </View>
          );
        }

        // Map tab config name to actual route index
        // Routes in state: index(0)=index, index(1)=profile
        const routeNameMap: Record<string, number> = {
          index: 0,
          profile: 1,
        };
        const routeIndex = routeNameMap[tab.name];
        const isFocused = routeIndex !== undefined && state.index === routeIndex;
        const route = routeIndex !== undefined ? state.routes[routeIndex] : undefined;

        const onPress = () => {
          if (!route) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const color = isFocused ? Colors.primary : Colors.tabInactive;

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingTop: 4,
            }}
          >
            {/* Active dot indicator */}
            {isFocused && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: Colors.primary,
                  marginBottom: 4,
                }}
              />
            )}
            {!isFocused && <View style={{ height: 10 }} />}
            <AnimatedTabIcon
              iconOutline={tab.iconOutline}
              iconFilled={tab.iconFilled}
              isFocused={isFocused}
            />
            <Text
              style={{
                ...Typography.tabLabel,
                color,
                marginTop: 2,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Tab Layout ---
export default function TabLayout() {
  return (
    <ErrorBoundary>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </ErrorBoundary>
  );
}
