import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { clsx } from "clsx";
import { View } from "react-native";

interface MosqueMarkerProps {
  selected?: boolean;
  onLayout?: () => void;
}

const MosqueMarker = ({ selected = false, onLayout }: MosqueMarkerProps) => {
  return (
    <View
      onLayout={onLayout}
      className={clsx(
        "border-primary items-center justify-center rounded-full border-2",
        selected ? "bg-primary size-12" : "bg-card size-10",
      )}
    >
      <Fa
        name="mosque"
        size={selected ? 20 : 17}
        className={clsx(
          "will-change-variable",
          selected ? "text-primary-foreground" : "text-primary",
        )}
      />
    </View>
  );
};

export default MosqueMarker;
