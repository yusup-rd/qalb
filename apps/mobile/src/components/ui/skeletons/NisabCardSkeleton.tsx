import type { ZakatNisabStandard } from "@/types/zakat";
import { View } from "react-native";

interface NisabCardSkeletonProps {
  nisabStandard: ZakatNisabStandard;
}

export const NisabCardSkeleton = ({
  nisabStandard,
}: NisabCardSkeletonProps) => {
  return (
    <>
      <View className="gap-3">
        {["gold-price", "silver-price"].map((key) => (
          <View key={key} className="flex-row items-center justify-between">
            <View className="bg-muted h-5 w-16 animate-pulse rounded-sm" />
            <View className="bg-muted h-5 w-20 animate-pulse rounded-sm" />
          </View>
        ))}
      </View>

      <View className="bg-border h-px" />

      <View className="gap-3">
        <View className="flex-row gap-3">
          {["silver", "gold"].map((standard) => (
            <View
              key={standard}
              className={
                standard === nisabStandard
                  ? "border-primary bg-primary-muted flex-1 gap-1 rounded-2xl border-2 p-4"
                  : "border-border bg-card flex-1 gap-1 rounded-2xl border p-4"
              }
            >
              <View className="bg-muted h-5 w-14 animate-pulse rounded-sm" />
              <View className="bg-muted h-4 w-16 animate-pulse rounded-sm" />
            </View>
          ))}
        </View>

        <View className="bg-muted gap-1 rounded-xl p-4">
          <View className="bg-background h-4 w-24 animate-pulse rounded-sm" />
          <View className="bg-background h-6 w-28 animate-pulse rounded-sm" />
        </View>
      </View>

      <View className="bg-muted h-3 w-36 animate-pulse rounded-sm" />
    </>
  );
};
