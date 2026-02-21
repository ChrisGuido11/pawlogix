import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GradientBackground } from '@/components/ui/gradient-background';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { useAuth } from '@/lib/auth-context';
import { usePets } from '@/lib/pet-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Shadows } from '@/constants/spacing';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';

const RECORD_TYPES = [
  { key: 'lab_results', label: 'Lab Results', icon: 'flask-outline' },
  { key: 'vet_visit', label: 'Vet Visit', icon: 'medkit-outline' },
  { key: 'vaccine', label: 'Vaccine Record', icon: 'shield-checkmark-outline' },
  { key: 'prescription', label: 'Prescription', icon: 'document-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

type Step = 'choose' | 'camera' | 'preview' | 'details';

function StaggeredItem({ index, children }: { index: number; children: React.ReactNode }) {
  const animStyle = useStaggeredEntrance(index);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export default function RecordScanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePet, pets } = usePets();
  const [step, setStep] = useState<Step>('choose');
  const [images, setImages] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('lab_results');
  const [selectedPetId, setSelectedPetId] = useState<string>(activePet?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);

  const takePhoto = async () => {
    if (!cameraRef) return;
    const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      setImages([...images, photo.uri]);
      setStep('preview');
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages([...images, ...result.assets.map((a) => a.uri)]);
      setStep('preview');
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Camera access is required to scan records.');
        return;
      }
    }
    setStep('camera');
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (updated.length === 0) setStep('choose');
  };

  const uploadImages = async (recordId: string): Promise<string[]> => {
    if (!user) return [];
    const urls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const uri = images[i];
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${recordId}/${i}.${fileExt}`;

      const { error } = await supabase.storage
        .from('pl-record-images')
        .upload(filePath, blob, { contentType: `image/${fileExt}` });

      if (error) throw error;
      urls.push(filePath);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!user || images.length === 0 || !selectedPetId) return;
    setIsSubmitting(true);
    try {
      const recordId = Crypto.randomUUID();
      const imageUrls = await uploadImages(recordId);

      const { error } = await supabase.from('pl_health_records').insert({
        id: recordId,
        pet_id: selectedPetId,
        user_id: user.id,
        record_type: selectedType,
        record_date: new Date().toISOString().split('T')[0],
        image_urls: imageUrls,
        processing_status: 'pending',
      });

      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const pet = pets.find((p) => p.id === selectedPetId);

      fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pl-interpret-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            record_id: recordId,
            image_urls: imageUrls,
            pet_species: pet?.species ?? 'dog',
            pet_breed: pet?.breed ?? 'unknown',
            record_type: selectedType,
          }),
        }
      ).catch(console.error);

      router.replace(`/record/processing/${recordId}` as any);
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        message: error.message || 'Check your connection and try again.',
        preset: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Camera View
  if (step === 'camera') {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          ref={(ref) => setCameraRef(ref)}
          className="flex-1"
          facing="back"
        >
          <SafeAreaView className="flex-1 justify-between">
            <Pressable onPress={() => setStep('choose')} className="p-4">
              <Ionicons name="close" size={28} color="white" />
            </Pressable>
            <View className="items-center pb-8">
              <Pressable
                onPress={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
              >
                <View className="w-16 h-16 rounded-full bg-white" />
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <GradientBackground variant="warm">
        <SafeAreaView className="flex-1">
          <ScrollView className="flex-1 px-5 pt-4 pb-8">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Pressable
                onPress={() => router.back()}
                style={[Shadows.sm, { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }]}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
              </Pressable>
              <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.textPrimary }}>
                Scan a Record
              </Text>
              <View className="w-10" />
            </View>

            {/* Step: Choose Method */}
            {step === 'choose' && (
              <View className="gap-4">
                <StaggeredItem index={0}>
                  <Card onPress={openCamera} variant="elevated" className="py-8 items-center" style={{ minHeight: 120 }}>
                    <LinearGradient
                      colors={[...Gradients.primaryCta]}
                      style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                    >
                      <Ionicons name="camera-outline" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <Text className="text-lg font-bold text-text-primary">
                      Take Photo
                    </Text>
                    <Text className="text-sm text-text-secondary mt-1">
                      Use your camera to scan a document
                    </Text>
                  </Card>
                </StaggeredItem>

                <StaggeredItem index={1}>
                  <Card onPress={pickFromLibrary} variant="elevated" className="py-8 items-center" style={{ minHeight: 120 }}>
                    <LinearGradient
                      colors={[...Gradients.secondaryCta]}
                      style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                    >
                      <Ionicons name="images-outline" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <Text className="text-lg font-bold text-text-primary">
                      Upload from Library
                    </Text>
                    <Text className="text-sm text-text-secondary mt-1">
                      Select existing photos from your device
                    </Text>
                  </Card>
                </StaggeredItem>
              </View>
            )}

            {/* Step: Preview Images */}
            {(step === 'preview' || step === 'details') && (
              <>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary }}
                  className="uppercase mb-3"
                >
                  Selected Images ({images.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-5"
                >
                  {images.map((uri, index) => (
                    <View key={index} className="mr-3 relative">
                      <View style={[Shadows.md, { borderRadius: 12 }]}>
                        <Image
                          source={{ uri }}
                          style={{ width: 140, height: 180, borderRadius: 12 }}
                        />
                      </View>
                      <Pressable
                        onPress={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-error items-center justify-center"
                        style={Shadows.sm}
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    onPress={pickFromLibrary}
                    style={{ width: 140, height: 180, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={28} color={Colors.textTertiary} />
                    <Text className="text-xs text-text-tertiary mt-1">Add More</Text>
                  </Pressable>
                </ScrollView>

                {step === 'preview' && (
                  <Button
                    title="Continue"
                    onPress={() => setStep('details')}
                    className="mb-4"
                  />
                )}
              </>
            )}

            {/* Step: Details */}
            {step === 'details' && (
              <>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary }}
                  className="uppercase mb-3"
                >
                  Record Type
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {RECORD_TYPES.map((type) => {
                    const isSelected = selectedType === type.key;
                    return (
                      <Pressable
                        key={type.key}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedType(type.key);
                        }}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={[Colors.primary50, Colors.primary100]}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.primary200 }}
                          >
                            <Ionicons name={type.icon as any} size={16} color={Colors.primary} />
                            <Text className="text-sm font-bold text-primary">{type.label}</Text>
                          </LinearGradient>
                        ) : (
                          <View
                            style={[Shadows.sm, { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: Colors.surface }]}
                          >
                            <Ionicons name={type.icon as any} size={16} color={Colors.textSecondary} />
                            <Text className="text-sm font-medium text-text-secondary">{type.label}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {pets.length > 1 && (
                  <>
                    <Text
                      style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: Colors.textSecondary }}
                      className="uppercase mb-3"
                    >
                      Which Pet?
                    </Text>
                    <View className="gap-2 mb-5">
                      {pets.map((pet) => (
                        <Pressable
                          key={pet.id}
                          onPress={() => setSelectedPetId(pet.id)}
                        >
                          <Card selected={selectedPetId === pet.id}>
                            <View className="flex-row items-center gap-3">
                              <Ionicons
                                name="paw"
                                size={20}
                                color={selectedPetId === pet.id ? Colors.primary : Colors.textSecondary}
                              />
                              <Text
                                className={`text-base font-semibold ${
                                  selectedPetId === pet.id ? 'text-primary' : 'text-text-primary'
                                }`}
                              >
                                {pet.name}
                              </Text>
                            </View>
                          </Card>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <Button
                  title="Interpret This Record"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  icon="sparkles"
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </View>
  );
}
