import { View } from "react-native";

export const AyahCardSkeleton = () => {
  return (
    <View className="bg-card animate-pulse gap-4 rounded-2xl p-4">
      <View className="flex-row items-center justify-between">
        <View className="bg-muted h-4 w-10 rounded-md" />
        <View className="bg-muted size-8 rounded-full" />
      </View>
      <View className="items-end gap-3">
        <View className="bg-muted h-8 w-4/5 rounded-md" />
        <View className="bg-muted h-8 w-3/5 rounded-md" />
      </View>
      <View className="bg-muted h-4 w-2/5 rounded-md" />
      <View className="gap-2">
        <View className="bg-muted h-4 w-full rounded-md" />
        <View className="bg-muted h-4 w-4/5 rounded-md" />
      </View>
    </View>
  );
};
