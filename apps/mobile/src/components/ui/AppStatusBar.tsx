import { useTheme } from "@/providers/ThemeProvider";
import { StatusBar } from "react-native";

const AppStatusBar = () => {
  const { resolvedMode, colors } = useTheme();

  return (
    <StatusBar
      barStyle={resolvedMode === "dark" ? "light-content" : "dark-content"}
      backgroundColor={colors.background}
      translucent={false}
    />
  );
};

export default AppStatusBar;
