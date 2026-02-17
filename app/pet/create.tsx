import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { usePets } from '@/lib/pet-context';
import { supabase } from '@/lib/supabase';
import { getBreedsBySpecies } from '@/constants/breeds';
import { toast } from '@/lib/toast';
import * as Crypto from 'expo-crypto';

const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  species: z.enum(['dog', 'cat']),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  weightKg: z.string().optional(),
  notes: z.string().optional(),
});

type PetForm = z.infer<typeof petSchema>;

export default function PetCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshPets } = usePets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedPicker, setShowBreedPicker] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    defaultValues: { name: '', species: 'dog', breed: '', dateOfBirth: '', weightKg: '', notes: '' },
  });

  const species = watch('species');
  const breeds = getBreedsBySpecies(species);
  const filteredBreeds = breedSearch
    ? breeds.filter((b) => b.toLowerCase().includes(breedSearch.toLowerCase()))
    : breeds;

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

      const formData = new FormData();
      formData.append('', {
        uri: photoUri,
        name: `${petId}.jpg`,
        type: 'image/jpeg',
      } as any);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/pl-pet-photos/${filePath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`Upload failed: ${errBody}`);
      }

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
        date_of_birth: data.dateOfBirth || null,
        weight_kg: data.weightKg ? parseFloat(data.weightKg) : null,
        photo_url: photoUrl,
        notes: data.notes || null,
        is_active: true,
      });

      if (error) throw error;

      await refreshPets();
      toast({ title: `${data.name} added!`, preset: 'done' });
      router.replace('/(tabs)');
    } catch (error: any) {
      toast({ title: 'Error', message: error.message || 'Failed to add pet', preset: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 pt-4 pb-8" keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </Pressable>

          <Text className="text-3xl font-bold text-text-primary mb-2">
            Add Your Pet
          </Text>
          <Text className="text-base text-text-secondary mb-6">
            Tell us about your furry friend
          </Text>

          {/* Photo Picker */}
          <Pressable onPress={pickImage} className="self-center mb-6 items-center">
            {photoUri ? (
              <View>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 120, height: 120, borderRadius: 60 }}
                />
                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-white">
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View className="items-center">
                <View className="w-[120px] h-[120px] rounded-full bg-primary/10 items-center justify-center border-2 border-dashed border-primary/30">
                  <Ionicons name="camera-outline" size={36} color="#0D7377" />
                </View>
                <Text className="text-sm text-text-secondary mt-2">Tap to add photo</Text>
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
          <Text className="text-sm font-medium text-text-primary mb-1.5">Species *</Text>
          <View className="flex-row gap-3 mb-4">
            <Pressable
              onPress={() => { setValue('species', 'dog'); setValue('breed', ''); }}
              className={`flex-1 rounded-lg py-3 items-center border ${
                species === 'dog' ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
              }`}
            >
              <Ionicons name="paw" size={24} color={species === 'dog' ? '#0D7377' : '#64748B'} />
              <Text className={`text-sm font-medium mt-1 ${species === 'dog' ? 'text-primary' : 'text-text-secondary'}`}>
                Dog
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setValue('species', 'cat'); setValue('breed', ''); }}
              className={`flex-1 rounded-lg py-3 items-center border ${
                species === 'cat' ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
              }`}
            >
              <Ionicons name="paw-outline" size={24} color={species === 'cat' ? '#0D7377' : '#64748B'} />
              <Text className={`text-sm font-medium mt-1 ${species === 'cat' ? 'text-primary' : 'text-text-secondary'}`}>
                Cat
              </Text>
            </Pressable>
          </View>

          {/* Breed Picker */}
          <Controller
            control={control}
            name="breed"
            render={({ field: { value } }) => (
              <View className="mb-4">
                <Text className="text-sm font-medium text-text-primary mb-1.5">Breed</Text>
                <Pressable
                  onPress={() => setShowBreedPicker(!showBreedPicker)}
                  className="bg-surface rounded-lg border border-border px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className={value ? 'text-base text-text-primary' : 'text-base text-text-secondary'}>
                    {value || 'Select breed'}
                  </Text>
                  <Ionicons name={showBreedPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
                </Pressable>
                {showBreedPicker && (
                  <Card className="mt-2 max-h-48">
                    <TextInput
                      className="bg-background rounded-lg border border-border px-3 py-2 text-sm text-text-primary mb-2"
                      placeholder="Search breeds..."
                      placeholderTextColor="#64748B"
                      value={breedSearch}
                      onChangeText={setBreedSearch}
                    />
                    <ScrollView className="max-h-32" nestedScrollEnabled>
                      {filteredBreeds.map((breed) => (
                        <Pressable
                          key={breed}
                          onPress={() => {
                            setValue('breed', breed);
                            setShowBreedPicker(false);
                            setBreedSearch('');
                          }}
                          className="py-2 px-1"
                        >
                          <Text className={`text-sm ${value === breed ? 'text-primary font-medium' : 'text-text-primary'}`}>
                            {breed}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </Card>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date of Birth"
                placeholder="YYYY-MM-DD (approximate is fine)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                containerClassName="mb-4"
              />
            )}
          />

          <Controller
            control={control}
            name="weightKg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Weight (kg)"
                placeholder="e.g., 25.5"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
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
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
