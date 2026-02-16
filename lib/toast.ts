import { Alert, Platform } from 'react-native';

interface ToastOptions {
  title: string;
  message?: string;
  preset?: 'done' | 'error' | 'none';
}

export function toast({ title, message, preset }: ToastOptions) {
  // Simple alert-based toast for beta
  // Can be replaced with a proper toast library later
  if (Platform.OS === 'web') {
    console.log(`[Toast] ${title}: ${message ?? ''}`);
    return;
  }
  Alert.alert(title, message);
}
