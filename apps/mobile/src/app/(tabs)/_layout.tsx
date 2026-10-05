import { getNativeTabColors } from "@/constants/theme";
import { useTheme } from "@/providers/ThemeProvider";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";
import { Platform, useColorScheme } from "react-native";

const TabsLayout = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const nativeTabColors = getNativeTabColors(colorScheme === "dark");

  if (Platform.OS === "ios") {
    return (
      <NativeTabs
        iconColor={{
          default: nativeTabColors.foreground,
          selected: nativeTabColors.primary,
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "house", selected: "house.fill" }}
            md="home"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="quran">
          <NativeTabs.Trigger.Label>{t("tabs.quran")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "book.closed", selected: "book.closed.fill" }}
            md="menu_book"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="qibla">
          <NativeTabs.Trigger.Label>{t("tabs.qibla")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "location.north", selected: "location.north.fill" }}
            md="explore"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="mosques">
          <NativeTabs.Trigger.Label>
            {t("tabs.mosques")}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "mappin", selected: "mappin.and.ellipse" }}
            md="location_on"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>
            {t("tabs.settings")}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "gearshape", selected: "gearshape.fill" }}
            md="settings"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: "sans-medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <Fa name="mosque" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: t("tabs.quran"),
          tabBarIcon: ({ color, size }) => (
            <Fa name="book-quran" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: t("tabs.qibla"),
          tabBarIcon: ({ color, size }) => (
            <Fa name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mosques"
        options={{
          title: t("tabs.mosques"),
          tabBarIcon: ({ color, size }) => (
            <Fa name="location-dot" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, size }) => (
            <Fa name="gear" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
