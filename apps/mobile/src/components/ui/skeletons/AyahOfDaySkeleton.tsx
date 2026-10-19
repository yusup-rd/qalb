import { useQuranPreferencesStore } from "@/store/quranPreferencesStore";
import { View } from "react-native";

export const AyahOfDaySkeleton = () => {
  const showTranslation = useQuranPreferencesStore(
    (state) => state.showTranslation,
  );
  const showTransliteration = useQuranPreferencesStore(
    (state) => state.showTransliteration,
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="bg-card overflow-hidden rounded-xl shadow-md"
    >
      <View className="border-l-secondary gap-2 border-l-6 p-6">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1.5">
            <View className="bg-muted h-3 w-3 animate-pulse rounded-sm" />
            <View className="bg-muted h-3 w-24 animate-pulse rounded-sm" />
          </View>
          <View className="bg-muted h-3 w-24 animate-pulse rounded-sm" />
        </View>

        <View className="items-end gap-2">
          <View className="bg-muted h-8 w-full animate-pulse rounded-md" />
          <View className="bg-muted h-8 w-4/5 animate-pulse rounded-md" />
        </View>

        {showTransliteration ? (
          <View className="bg-muted h-4 w-3/4 animate-pulse rounded-sm" />
        ) : null}

        {showTranslation ? (
          <View className="gap-2">
            <View className="bg-muted h-4 w-full animate-pulse rounded-sm" />
            <View className="bg-muted h-4 w-4/5 animate-pulse rounded-sm" />
          </View>
        ) : null}

        <View className="items-end">
          <View className="bg-muted h-8 w-24 animate-pulse rounded-full" />
        </View>
      </View>
    </View>
  );
};
