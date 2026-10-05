import { ActivityIndicator, Text, View } from "react-native";

interface LoadingCardProps {
  title: string;
  message: string;
}

const LoadingCard = ({ title, message }: LoadingCardProps) => {
  return (
    <View className="bg-card flex-row gap-2 rounded-xl p-5 shadow-md">
      <ActivityIndicator size="small" />
      <View className="flex-1">
        <Text className="font-sans-semibold text-foreground text-base">
          {title}
        </Text>
        <Text className="text-muted-foreground font-sans text-sm">
          {message}
        </Text>
      </View>
    </View>
  );
};

export default LoadingCard;
