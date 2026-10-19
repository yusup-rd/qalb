import { View } from "react-native";

export const MosqueCardSkeleton = () => {
  return (
    <View className="bg-card border-border gap-2 rounded-xl border p-4">
      <View className="flex-row items-center gap-3">
        <View className="bg-muted size-11 animate-pulse rounded-full" />
        <View className="flex-1 gap-2">
          <View className="bg-muted h-4 w-2/3 animate-pulse rounded-sm" />
          <View className="bg-muted h-3 w-1/2 animate-pulse rounded-sm" />
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="bg-muted h-4 w-16 animate-pulse rounded-sm" />
        <View className="bg-muted size-1 animate-pulse rounded-full" />
        <View className="bg-muted h-4 w-14 animate-pulse rounded-sm" />
      </View>

      <View className="bg-muted h-11 animate-pulse rounded-lg" />
    </View>
  );
};
