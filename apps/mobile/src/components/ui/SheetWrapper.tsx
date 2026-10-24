import { useTheme } from "@/providers/ThemeProvider";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
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
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={snapPoints}
        // TODO: Check both android and ios behavior for background color, and remove the commented code if not needed
        containerColor={colors.background}
        // {...(Platform.OS === "android"
        // ? { containerColor: colors.background }
        // : {
        //     modifiers: [
        //       presentationBackground(colors.background),
        //       background(colors.background),
        //     ],
        //   })}
        contentPadding={{
          left: 20,
          right: 20,
        }}
      >
        <RNHostView>{children}</RNHostView>
      </BottomSheet>
    </Host>
  );
};

export default SheetWrapper;
