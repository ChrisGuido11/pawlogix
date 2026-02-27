import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: Spacing['3xl'],
          }}
        >
          <View
            style={[
              Shadows.md,
              {
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.card,
                padding: Spacing['3xl'],
                alignItems: 'center',
                width: '100%',
                maxWidth: 340,
              },
            ]}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.errorLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.xl,
              }}
            >
              <Ionicons name="alert-circle" size={32} color={Colors.error} />
            </View>

            <Text
              style={[
                Typography.sectionHeading,
                {
                  color: Colors.textHeading,
                  textAlign: 'center',
                  marginBottom: Spacing.sm,
                },
              ]}
            >
              Something went wrong
            </Text>

            <Text
              style={[
                Typography.body,
                {
                  color: Colors.textMuted,
                  textAlign: 'center',
                  marginBottom: Spacing['2xl'],
                },
              ]}
            >
              An unexpected error occurred. Please try again.
            </Text>

            <Pressable
              onPress={this.handleReset}
              style={[
                Shadows.primaryButton,
                {
                  backgroundColor: Colors.primary,
                  borderRadius: BorderRadius.button,
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing['2xl'],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                },
              ]}
            >
              <Ionicons name="refresh" size={18} color={Colors.textOnPrimary} />
              <Text
                style={[
                  Typography.buttonPrimary,
                  { color: Colors.textOnPrimary },
                ]}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
