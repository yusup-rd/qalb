import { useTheme } from "@/providers/ThemeProvider";
import { BottomSheet, RNHostView } from "@expo/ui";
import type { ReactElement } from "react";

type SheetSnapPoint = "half" | "full";

interface SheetWrapperProps {
  visible: boolean;
  onClose: () => void;
  children: ReactElement;
  snapPoints?: SheetSnapPoint[];
}

const SheetWrapper = ({
  visible,
  onClose,
  children,
  snapPoints = ["half"],
}: SheetWrapperProps) => {
  const { colors } = useTheme();

  return (
    <BottomSheet
      isPresented={visible}
      onDismiss={onClose}
      snapPoints={snapPoints}
      containerColor={colors.background}
      contentPadding={{
        left: 20,
        right: 20,
      }}
    >
      <RNHostView>{children}</RNHostView>
    </BottomSheet>
  );
};

export default SheetWrapper;
