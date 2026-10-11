import { useTheme } from "@/providers/ThemeProvider";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import { background } from "@expo/ui/jetpack-compose/modifiers";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import type { ReactElement } from "react";
import { Platform } from "react-native";

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

  // TODO: Revisit this workaround when upgrading Expo/@expo/ui (e.g. SDK 58+).
  // iOS: Both presentationBackground and Jetpack Compose's background modifier
  // are currently required for the sheet to use the themed background color.
  // Android: Use containerColor instead; the background modifier colors the
  // area behind the sheet rather than the sheet itself.
  // Verify behavior on both platforms before removing or simplifying this.
  return (
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={snapPoints}
        {...(Platform.OS === "android"
          ? { containerColor: colors.background }
          : {
              modifiers: [
                presentationBackground(colors.background),
                background(colors.background),
              ],
            })}
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
