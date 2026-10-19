import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface QuranPreferencesStore {
  showTranslation: boolean;
  showTransliteration: boolean;
  setShowTranslation: (show: boolean) => void;
  setShowTransliteration: (show: boolean) => void;
}

export const useQuranPreferencesStore = create<QuranPreferencesStore>()(
  persist(
    (set) => ({
      showTranslation: true,
      showTransliteration: true,
      setShowTranslation: (show) => set({ showTranslation: show }),
      setShowTransliteration: (show) => set({ showTransliteration: show }),
    }),
    {
      name: "@app/quran-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
