import { useTheme } from "@/providers/ThemeProvider";
import { StatusBar } from "expo-status-bar";

const AppStatusBar = () => {
  const { resolvedMode } = useTheme();

  return (
    <StatusBar
      style={resolvedMode === "dark" ? "light" : "dark"}
    />
  );
};

export default AppStatusBar;
