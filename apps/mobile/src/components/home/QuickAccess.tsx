import { View } from "react-native";
import QuickAccessButton from "./QuickAccessButton";

const QuickAccess = () => {
  return (
    <View className="flex-row flex-wrap gap-2">
      <View className="flex-1 basis-[45%]">
        <QuickAccessButton type="quran" />
      </View>
      <View className="flex-1 basis-[45%]">
        <QuickAccessButton type="mosques" />
      </View>
      <View className="flex-1 basis-[45%]">
        <QuickAccessButton type="prayer" />
      </View>
      <View className="flex-1 basis-[45%]">
        <QuickAccessButton type="zakat" />
      </View>
      <View className="flex-1 basis-[45%]">
        <QuickAccessButton type="tasbih" />
      </View>
    </View>
  );
};

export default QuickAccess;
