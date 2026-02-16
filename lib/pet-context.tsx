import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import type { PetProfile } from '@/types';

interface PetContextType {
  pets: PetProfile[];
  activePet: PetProfile | null;
  isLoading: boolean;
  setActivePet: (pet: PetProfile) => void;
  refreshPets: () => Promise<void>;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

export function PetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [activePet, setActivePet] = useState<PetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPets = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pl_pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const petList = (data ?? []) as PetProfile[];
      setPets(petList);

      if (!activePet && petList.length > 0) {
        setActivePet(petList[0]);
      } else if (activePet) {
        const updated = petList.find((p) => p.id === activePet.id);
        if (updated) setActivePet(updated);
        else if (petList.length > 0) setActivePet(petList[0]);
        else setActivePet(null);
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPets();
  }, [refreshPets]);

  return (
    <PetContext.Provider
      value={{ pets, activePet, isLoading, setActivePet, refreshPets }}
    >
      {children}
    </PetContext.Provider>
  );
}

export function usePets() {
  const context = useContext(PetContext);
  if (!context) throw new Error('usePets must be used within PetProvider');
  return context;
}
