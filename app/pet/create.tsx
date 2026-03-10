import { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useAuth } from '@/lib/auth-context';
import { usePets } from '@/lib/pet-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { Typography, Fonts } from '@/constants/typography';
import { SectionLabel } from '@/components/ui/section-label';
import * as Crypto from 'expo-crypto';
import { File as ExpoFile } from 'expo-file-system';
import * as Haptics from 'expo-haptics';

const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  species: z.enum(['dog', 'cat']),
  breed: z.string().optional(),
  notes: z.string().optional(),
});

type PetForm = z.infer<typeof petSchema>;

export default function PetCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshPets } = usePets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const navigation = useNavigation();

  const { control, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    defaultValues: { name: '', species: 'dog', breed: '', notes: '' },
  });

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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (petId: string): Promise<string | null> => {
    if (!photoUri || !user) return null;
    try {
      const filePath = `${user.id}/${petId}.jpg`;

      const file = new ExpoFile(photoUri);
      const arrayBuffer = await file.arrayBuffer();

      const { error } = await supabase.storage
        .from('pl-pet-photos')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('pl-pet-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      return null;
    }
  };

  const onSubmit = async (data: PetForm) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const petId = Crypto.randomUUID();
      const photoUrl = await uploadPhoto(petId);

      const { error } = await supabase.from('pl_pets').insert({
        id: petId,
        user_id: user.id,
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        photo_url: photoUrl,
        notes: data.notes || null,
        is_active: true,
      });

      if (error) throw error;

      await refreshPets();
      setSubmitSuccess(true);
      toast({ title: `${data.name} added!`, preset: 'done' });
      router.replace('/(tabs)');
    } catch (error: any) {
      toast({ title: 'Error', message: error.message || 'Failed to add pet', preset: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CurvedHeaderPage
      headerProps={{ title: 'Add Your Pet', showBack: true }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
          <Text style={[Typography.body, { color: Colors.textBody, marginBottom: Spacing['2xl'] }]}>
            Tell us about your furry friend
          </Text>

          {/* Photo Picker */}
          <Pressable onPress={pickImage} accessibilityLabel="Add pet photo" accessibilityRole="button" style={{ alignSelf: 'center', marginBottom: Spacing['2xl'], alignItems: 'center' }}>
            {photoUri ? (
              <View style={[Shadows.lg, { borderRadius: 60 }]}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 120, height: 120, borderRadius: 60 }}
                />
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.textOnPrimary }}>
                  <Ionicons name="camera" size={14} color={Colors.textOnPrimary} />
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={[Shadows.primaryButton, { borderRadius: 60 }]}>
                  <LinearGradient
                    colors={[...Gradients.primaryCta]}
                    style={{ width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="camera-outline" size={40} color={Colors.textOnPrimary} />
                  </LinearGradient>
                </View>
                <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.md }]}>Tap to add photo</Text>
              </View>
            )}
          </Pressable>

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
                containerClassName="mb-4"
              />
            )}
          />

          {/* Species Selector */}
          <SectionLabel style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
            Species *
          </SectionLabel>
          <View className="flex-row gap-3 mb-4">
            {(['dog', 'cat'] as const).map((s) => {
              const isSelected = species === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setValue('species', s); setValue('breed', ''); }}
                  style={[
                    isSelected ? Shadows.md : Shadows.sm,
                    { flex: 1, borderRadius: BorderRadius.card },
                  ]}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={[Colors.primaryLight, Colors.primaryLight]}
                      style={{ borderRadius: BorderRadius.card, paddingVertical: Spacing.lg, alignItems: 'center' }}
                    >
                      <Ionicons name="paw" size={28} color={Colors.primary} />
                      <Text style={[Typography.secondary, { fontFamily: Fonts.bold, color: Colors.primary, marginTop: 6 }]}>
                        {s === 'dog' ? 'Dog' : 'Cat'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ backgroundColor: Colors.surface, borderRadius: BorderRadius.card, paddingVertical: Spacing.lg, alignItems: 'center' }}>
                      <Ionicons name="paw-outline" size={28} color={Colors.textBody} />
                      <Text style={[Typography.secondary, { fontFamily: Fonts.medium, color: Colors.textBody, marginTop: 6 }]}>
                        {s === 'dog' ? 'Dog' : 'Cat'}
                      </Text>
                    </View>
                  )}
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
                containerClassName="mb-4"
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Notes (optional)"
                placeholder="Allergies, conditions, anything the vet should know..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                containerClassName="mb-6"
              />
            )}
          />

          <Button
            title="Save Pet"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            icon="paw"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </CurvedHeaderPage>
  );
}
