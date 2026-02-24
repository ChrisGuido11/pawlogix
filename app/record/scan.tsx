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
import { CurvedHeaderPage } from '@/components/ui/curved-header';
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { useAuth } from '@/lib/auth-context';
import { usePets } from '@/lib/pet-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Colors, Gradients } from '@/constants/Colors';
import { Typography, Fonts } from '@/constants/typography';
import { Shadows, Spacing, BorderRadius } from '@/constants/spacing';
import { SectionLabel } from '@/components/ui/section-label';
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

      try {
        const fnResponse = await fetch(
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
        );
        if (!fnResponse.ok) {
          await supabase.from('pl_health_records')
            .update({ processing_status: 'failed', processing_error: 'Failed to start analysis.' })
            .eq('id', recordId);
        }
      } catch (e) {
        await supabase.from('pl_health_records')
          .update({ processing_status: 'failed', processing_error: 'Could not reach analysis service.' })
          .eq('id', recordId);
      }

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
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={(ref) => setCameraRef(ref)}
          style={{ flex: 1 }}
          facing="back"
          responsiveOrientationWhenOrientationLocked
        >
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
            <Pressable onPress={() => setStep('choose')} style={{ padding: Spacing.lg }}>
              <Ionicons name="close" size={28} color={Colors.textOnPrimary} />
            </Pressable>
            <View style={{ alignItems: 'center', paddingBottom: Spacing['2xl'] }}>
              <Pressable
                onPress={takePhoto}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' }} />
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <CurvedHeaderPage
      headerProps={{ title: 'Scan a Record', showBack: true }}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <ScrollView style={{ flex: 1, paddingHorizontal: Spacing.lg }} contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}>
        {/* Step: Choose Method */}
        {step === 'choose' && (
          <View style={{ gap: Spacing.lg }}>
            <StaggeredItem index={0}>
              <Card onPress={openCamera} variant="elevated" className="py-8 items-center" style={{ minHeight: 120 }}>
                <LinearGradient
                  colors={[...Gradients.primaryCta]}
                  style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }}
                >
                  <Ionicons name="camera-outline" size={28} color={Colors.textOnPrimary} />
                </LinearGradient>
                <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                  Take Photo
                </Text>
                <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.xs }]}>
                  Use your camera to scan a document
                </Text>
              </Card>
            </StaggeredItem>

            <StaggeredItem index={1}>
              <Card onPress={pickFromLibrary} variant="elevated" className="py-8 items-center" style={{ minHeight: 120 }}>
                <LinearGradient
                  colors={[...Gradients.primaryCta]}
                  style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }}
                >
                  <Ionicons name="images-outline" size={28} color={Colors.textOnPrimary} />
                </LinearGradient>
                <Text style={[Typography.cardTitle, { color: Colors.textHeading }]}>
                  Upload from Library
                </Text>
                <Text style={[Typography.secondary, { color: Colors.textBody, marginTop: Spacing.xs }]}>
                  Select existing photos from your device
                </Text>
              </Card>
            </StaggeredItem>

            <StaggeredItem index={2}>
              <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
                <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden' }}>
                  <Image
                    source={require('@/assets/illustrations/mascot-scanning.png')}
                    style={{ width: 140, height: 140 }}
                    contentFit="cover"
                  />
                </View>
                <Text style={[Typography.secondary, { color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' }]}>
                  Snap or upload your vet records and we'll do the rest!
                </Text>
              </View>
            </StaggeredItem>
          </View>
        )}

        {/* Step: Preview Images */}
        {(step === 'preview' || step === 'details') && (
          <>
            <SectionLabel style={{ marginBottom: Spacing.md }}>
              Selected Images ({images.length})
            </SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: Spacing.xl }}
            >
              {images.map((uri, index) => (
                <View key={index} style={{ marginRight: Spacing.md, position: 'relative' }}>
                  <View style={[Shadows.md, { borderRadius: BorderRadius.button }]}>
                    <Image
                      source={{ uri }}
                      style={{ width: 140, height: 180, borderRadius: BorderRadius.button }}
                    />
                  </View>
                  <Pressable
                    onPress={() => removeImage(index)}
                    style={[Shadows.sm, { position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' }]}
                  >
                    <Ionicons name="close" size={16} color={Colors.textOnPrimary} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={pickFromLibrary}
                style={{ width: 140, height: 180, borderRadius: BorderRadius.button, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={28} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: Spacing.xs }]}>Add More</Text>
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
            <SectionLabel style={{ marginBottom: Spacing.md }}>
              Record Type
            </SectionLabel>
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
                        colors={[Colors.primaryLight, Colors.primaryLight]}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.card, borderWidth: 1, borderColor: Colors.primary }}
                      >
                        <Ionicons name={type.icon as any} size={16} color={Colors.primary} />
                        <Text style={[Typography.secondary, { fontFamily: Fonts.bold, color: Colors.primary }]}>{type.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[Shadows.sm, { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.card, backgroundColor: Colors.surface }]}
                      >
                        <Ionicons name={type.icon as any} size={16} color={Colors.textBody} />
                        <Text style={[Typography.secondary, { fontFamily: Fonts.medium, color: Colors.textBody }]}>{type.label}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {pets.length > 1 && (
              <>
                <SectionLabel style={{ marginBottom: Spacing.md }}>
                  Which Pet?
                </SectionLabel>
                <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
                  {pets.map((pet) => {
                    const isSelected = selectedPetId === pet.id;
                    return (
                      <Pressable
                        key={pet.id}
                        onPress={() => setSelectedPetId(pet.id)}
                      >
                        <Card variant={isSelected ? 'elevated' : 'default'}>
                          <View className="flex-row items-center gap-3">
                            <Ionicons
                              name="paw"
                              size={20}
                              color={isSelected ? Colors.primary : Colors.textBody}
                            />
                            <Text
                              style={[Typography.buttonPrimary, {
                                color: isSelected ? Colors.primary : Colors.textHeading,
                              }]}
                            >
                              {pet.name}
                            </Text>
                            {isSelected && (
                              <View style={{ marginLeft: 'auto' }}>
                                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                              </View>
                            )}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
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
    </CurvedHeaderPage>
  );
}
