import { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { requestNotificationPermissions } from '@/lib/notifications';
import { toast } from '@/lib/toast';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';

interface MedicationReminderModalProps {
  visible: boolean;
  onClose: () => void;
  petId: string;
  petName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
}

function parseDefaultTimes(frequency: string): Array<{ hour: number; minute: number }> {
  const lower = (frequency ?? '').toLowerCase();
  if (/twice|bid|2\s*x/i.test(lower)) {
    return [
      { hour: 8, minute: 0 },
      { hour: 20, minute: 0 },
    ];
  }
  if (/three|tid|3\s*x/i.test(lower)) {
    return [
      { hour: 8, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 20, minute: 0 },
    ];
  }
  if (/four|qid|4\s*x/i.test(lower)) {
    return [
      { hour: 8, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 20, minute: 0 },
    ];
  }
  return [{ hour: 9, minute: 0 }];
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

export function MedicationReminderModal({
  visible,
  onClose,
  petId,
  petName,
  medicationName,
  dosage,
  frequency,
}: MedicationReminderModalProps) {
  const { getSchedule, setReminder, removeReminder } = useMedReminderScheduler();
  const [times, setTimes] = useState<Array<{ hour: number; minute: number }>>([]);
  const [hasExisting, setHasExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const existing = await getSchedule(petId, medicationName);
      if (existing && existing.times.length > 0) {
        setTimes(existing.times);
        setHasExisting(true);
      } else {
        setTimes(parseDefaultTimes(frequency));
        setHasExisting(false);
      }
      setEditingIndex(null);
      setShowPicker(false);
    })();
  }, [visible, petId, medicationName, frequency, getSchedule]);

  const handleAddTime = () => {
    setTimes((prev) => [...prev, { hour: 12, minute: 0 }]);
    setEditingIndex(times.length);
    setShowPicker(true);
  };

  const handleRemoveTime = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimes((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setShowPicker(false);
    }
  };

  const handleTimePress = (index: number) => {
    setEditingIndex(index);
    setShowPicker(true);
  };

  const handlePickerChange = (_event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate && editingIndex !== null) {
      setTimes((prev) =>
        prev.map((t, i) =>
          i === editingIndex
            ? { hour: selectedDate.getHours(), minute: selectedDate.getMinutes() }
            : t
        )
      );
    }
  };

  const handleSave = async () => {
    if (times.length === 0) {
      toast({ title: 'Add at least one time', preset: 'error' });
      return;
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      toast({
        title: 'Notifications Blocked',
        message: 'Please enable notifications in your device settings.',
        preset: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      await setReminder({ petId, petName, medicationName, dosage, times });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: 'Reminders saved', preset: 'done' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed to save', message: err.message, preset: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAll = async () => {
    setIsSaving(true);
    try {
      await removeReminder(petId, medicationName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: 'Reminders removed', preset: 'done' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed to remove', message: err.message, preset: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const pickerDate = (() => {
    if (editingIndex === null || !times[editingIndex]) return new Date();
    const d = new Date();
    d.setHours(times[editingIndex].hour, times[editingIndex].minute, 0, 0);
    return d;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.modalScrim,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={[
            Shadows.xl,
            {
              backgroundColor: Colors.surface,
              borderTopLeftRadius: BorderRadius.bottomSheet,
              borderTopRightRadius: BorderRadius.bottomSheet,
              paddingHorizontal: Spacing.xl,
              paddingTop: Spacing.xl,
              paddingBottom: Spacing['4xl'],
            },
          ]}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: BorderRadius.button,
                backgroundColor: Colors.successLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="medkit" size={22} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>{medicationName}</Text>
              {dosage ? (
                <Text style={[Typography.secondary, { color: Colors.textBody }]}>{dosage}</Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Times List */}
          <SectionLabel style={{ marginBottom: Spacing.sm }}>Reminder Times</SectionLabel>
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
            {times.map((time, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: editingIndex === index ? Colors.primaryLight : Colors.background,
                  borderRadius: BorderRadius.input,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                }}
              >
                <Ionicons name="alarm-outline" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                <Pressable onPress={() => handleTimePress(index)} style={{ flex: 1 }}>
                  <Text style={[Typography.body, { fontFamily: Fonts.semiBold, color: Colors.textHeading }]}>
                    {formatTime(time.hour, time.minute)}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleRemoveTime(index)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}

            {times.length < 6 && (
              <Pressable
                onPress={handleAddTime}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: Spacing.md,
                  borderRadius: BorderRadius.input,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: Colors.border,
                }}
              >
                <Ionicons name="add" size={20} color={Colors.primary} style={{ marginRight: Spacing.xs }} />
                <Text style={[Typography.body, { color: Colors.primary, fontFamily: Fonts.semiBold }]}>Add Time</Text>
              </Pressable>
            )}
          </View>

          {/* Time Picker */}
          {showPicker && (
            <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handlePickerChange}
                minuteInterval={5}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => {
                    setShowPicker(false);
                    setEditingIndex(null);
                  }}
                  style={{ marginTop: Spacing.sm }}
                >
                  <Text style={[Typography.body, { color: Colors.primary, fontFamily: Fonts.semiBold }]}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Actions */}
          <Button
            title="Save Reminders"
            onPress={handleSave}
            variant="primary"
            loading={isSaving}
          />

          {hasExisting && (
            <View style={{ marginTop: Spacing.sm }}>
              <Button
                title="Remove All Reminders"
                onPress={handleRemoveAll}
                variant="ghost"
                loading={isSaving}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
