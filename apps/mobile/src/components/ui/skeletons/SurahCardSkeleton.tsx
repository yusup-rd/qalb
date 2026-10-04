import { View } from "react-native";

export const SurahCardSkeleton = () => {
  return (
    <View className="bg-card animate-pulse flex-row items-center gap-4 rounded-2xl p-4">
      <View className="bg-muted size-10 rounded-full" />
      <View className="flex-1 gap-2">
        <View className="bg-muted h-4 w-32 rounded-md" />
        <View className="bg-muted h-3 w-20 rounded-md" />
      </View>
      <View className="bg-muted h-7 w-20 rounded-md" />
    </View>
  );
};
