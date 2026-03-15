import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionLabel } from '@/components/ui/section-label';
import { supabase } from '@/lib/supabase';
import { usePets } from '@/lib/pet-context';
import { toast } from '@/lib/toast';
import { Colors } from '@/constants/Colors';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import type { PetProfile } from '@/types';

const editPetSchema = z.object({
  name: z.string().min(1, 'Pet name is required').max(50, 'Name too long'),
  species: z.enum(['dog', 'cat']),
  breed: z.string().max(50, 'Breed too long').optional(),
  sex: z.enum(['male', 'female', '']).optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.string().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

type EditPetForm = z.infer<typeof editPetSchema>;

export default function PetEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { refreshPets } = usePets();
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = useForm<EditPetForm>({
    resolver: zodResolver(editPetSchema),
    defaultValues: { name: '', species: 'dog', breed: '', sex: '', date_of_birth: '', weight_kg: '', notes: '' },
  });

  const fetchPet = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('pl_pets')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const petData = data as PetProfile;
      setPet(petData);
      reset({
        name: petData.name,
        species: petData.species,
        breed: petData.breed ?? '',
        sex: petData.sex ?? '',
        date_of_birth: petData.date_of_birth ?? '',
        weight_kg: petData.weight_kg != null ? String(petData.weight_kg) : '',
        notes: petData.notes ?? '',
      });
    } catch (error) {
      toast({ title: 'Error', message: 'Could not load pet details', preset: 'error' });
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, reset, router]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  // Unsaved changes guard
  useEffect(() => {
    if (submitSuccess) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, submitSuccess]);

  const species = watch('species');

  const onSubmit = async (data: EditPetForm) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const updates: Record<string, unknown> = {
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        sex: data.sex || null,
        date_of_birth: data.date_of_birth || null,
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        notes: data.notes || null,
      };

      const { error } = await supabase.from('pl_pets').update(updates).eq('id', id);
      if (error) throw error;

      await refreshPets();
      setSubmitSuccess(true);
      toast({ title: `${data.name} updated!`, preset: 'done' });
      router.back();
    } catch (error: any) {
      toast({ title: 'Error', message: error.message || 'Failed to update pet', preset: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <CurvedHeaderPage headerProps={{ title: 'Edit Pet', showBack: true }}>
        <View style={{ gap: Spacing.lg, paddingTop: Spacing.xl }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      </CurvedHeaderPage>
    );
  }

  return (
    <CurvedHeaderPage headerProps={{ title: 'Edit Pet', showBack: true }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
          {/* Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Pet Name *"
                placeholder="What's your pet's name?"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
                maxLength={50}
                containerClassName="mb-4"
              />
            )}
          />

          {/* Species */}
          <SectionLabel style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
            Species *
          </SectionLabel>
          <View className="flex-row gap-3 mb-4">
            {(['dog', 'cat'] as const).map((s) => {
              const isSelected = species === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValue('species', s, { shouldDirty: true });
                  }}
                  style={[
                    isSelected ? Shadows.md : Shadows.sm,
                    { flex: 1, borderRadius: BorderRadius.card },
                  ]}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? Colors.primaryLight : Colors.surface,
                      borderRadius: BorderRadius.card,
                      paddingVertical: Spacing.lg,
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'paw' : 'paw-outline'}
                      size={28}
                      color={isSelected ? Colors.primary : Colors.textBody}
                    />
                    <Text
                      style={[
                        Typography.secondary,
                        {
                          fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                          color: isSelected ? Colors.primary : Colors.textBody,
                          marginTop: 6,
                        },
                      ]}
                    >
                      {s === 'dog' ? 'Dog' : 'Cat'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Sex */}
          <SectionLabel style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
            Sex
          </SectionLabel>
          <View className="flex-row gap-3 mb-4">
            {(['male', 'female'] as const).map((s) => {
              const currentSex = watch('sex');
              const isSelected = currentSex === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValue('sex', isSelected ? '' : s, { shouldDirty: true });
                  }}
                  style={[
                    isSelected ? Shadows.md : Shadows.sm,
                    { flex: 1, borderRadius: BorderRadius.card },
                  ]}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? Colors.primaryLight : Colors.surface,
                      borderRadius: BorderRadius.card,
                      paddingVertical: Spacing.lg,
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={s === 'male' ? 'male' : 'female'}
                      size={28}
                      color={isSelected ? Colors.primary : Colors.textBody}
                    />
                    <Text
                      style={[
                        Typography.secondary,
                        {
                          fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                          color: isSelected ? Colors.primary : Colors.textBody,
                          marginTop: 6,
                        },
                      ]}
                    >
                      {s === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Breed */}
          <Controller
            control={control}
            name="breed"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Breed"
                placeholder="e.g., Golden Retriever, Siamese"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                maxLength={50}
                containerClassName="mb-4"
              />
            )}
          />

          {/* Date of Birth */}
          <Controller
            control={control}
            name="date_of_birth"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date of Birth"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numbers-and-punctuation"
                containerClassName="mb-4"
              />
            )}
          />

          {/* Weight */}
          <Controller
            control={control}
            name="weight_kg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Weight (lbs)"
                placeholder="e.g., 45"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                containerClassName="mb-4"
              />
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Notes"
                placeholder="Allergies, conditions, anything the vet should know..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                maxLength={500}
                containerClassName="mb-6"
              />
            )}
          />

          <Button
            title="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={!isDirty}
            icon="checkmark-circle"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedHeaderPage>
  );
}
