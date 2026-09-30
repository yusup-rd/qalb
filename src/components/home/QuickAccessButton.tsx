import { DEFAULT_MOSQUE_RADIUS_KM } from "@/constants/mosques";
import { useNearbyMosques } from "@/hooks/useNearbyMosques";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { clsx } from "clsx";
import { Href, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

interface QuickAccessButtonProps {
  type: "quran" | "mosques" | "prayer" | "zakat" | "tasbih";
}

interface QuickAccessItem {
  icon: React.ComponentProps<typeof Fa>["name"];
  iconClassName: string;
  iconContainerClassName: string;
  badgeClassName: string;
  badgeTextClassName: string;
  titleKey: string;
  route: Href;
}

const quickAccessConfig: Record<
  QuickAccessButtonProps["type"],
  QuickAccessItem
> = {
  quran: {
    icon: "book-quran",
    iconClassName: "text-secondary-soft-foreground",
    iconContainerClassName: "bg-secondary-soft",
    badgeClassName: "bg-secondary-soft",
    badgeTextClassName: "text-secondary-soft-foreground",
    titleKey: "quran.title",
    route: "/quran",
  },
  mosques: {
    icon: "mosque",
    iconClassName: "text-primary-soft-foreground",
    iconContainerClassName: "bg-primary-soft",
    badgeClassName: "bg-primary-soft",
    badgeTextClassName: "text-primary-soft-foreground",
    titleKey: "mosques.title",
    route: "/mosques",
  },
  prayer: {
    icon: "calendar-days",
    iconClassName: "text-muted-foreground",
    iconContainerClassName: "bg-muted",
    badgeClassName: "",
    badgeTextClassName: "text-muted-foreground",
    titleKey: "prayerTimes.title",
    route: "/prayer-times",
  },
  zakat: {
    icon: "money-bill-wave",
    iconClassName: "text-muted-foreground",
    iconContainerClassName: "bg-muted",
    badgeClassName: "",
    badgeTextClassName: "text-muted-foreground",
    titleKey: "zakat.title",
    route: "/zakat",
  },
  tasbih: {
    icon: "hands-praying",
    iconClassName: "text-primary-soft-foreground",
    iconContainerClassName: "bg-primary-soft",
    badgeClassName: "bg-primary-soft",
    badgeTextClassName: "text-primary-soft-foreground",
    titleKey: "tasbih.title",
    route: "/tasbih",
  },
};

const QuickAccessButton = ({ type }: QuickAccessButtonProps) => {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: "home.quickAccess",
  });

  const kilometerUnit = i18n.t("units.kilometer");

  const item = quickAccessConfig[type];

  const mosques = useNearbyMosques(
    type === "mosques" ? DEFAULT_MOSQUE_RADIUS_KM : null,
  );

  const getBadge = () => {
    switch (type) {
      case "quran":
        return t("quran.badge");

      case "mosques": {
        const closestMosque = mosques[0];

        if (!closestMosque) {
          return "—";
        }

        const distanceMeters =
          closestMosque.drivingDistanceMeters ?? closestMosque.distanceMeters;

        const distanceKm = distanceMeters / 1_000;

        return t("mosques.badge", {
          distance: Number(distanceKm.toFixed(1)),
          unit: kilometerUnit,
        });
      }

      case "prayer":
        return t("prayerTimes.badge");

      case "zakat":
        return t("zakat.badge");

      case "tasbih":
        return t("tasbih.badge");
    }
  };

  const getDescription = () => {
    switch (type) {
      case "quran":
        // TODO: Replace with Quran reading tracker state.
        // If user has no reading history:
        // show "Read Quran". - (.default)
        // If user has progress:
        // show "Read Surah {{surahName}}" with the saved surah. - (.continue)
        return t("quran.description.continue", {
          surahName: "Al-Kahf",
        });

      case "mosques":
        return t("mosques.description", {
          count: mosques.length,
        });

      case "prayer":
        return t("prayerTimes.description");

      case "zakat":
        return t("zakat.description");

      case "tasbih":
        return t("tasbih.description");
    }
  };

  const handlePress = () => {
    router.push(item.route);
  };

  return (
    <Pressable
      className="bg-card gap-3 rounded-xl p-4 shadow-md active:opacity-75"
      onPress={handlePress}
      accessibilityLabel={t(item.titleKey)}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View
          className={clsx(
            "size-9 items-center justify-center rounded-full",
            item.iconContainerClassName,
          )}
        >
          <Fa name={item.icon} size={16} className={item.iconClassName} />
        </View>

        <View
          className={clsx(
            "flex items-center justify-center rounded-full px-2 py-0.5",
            item.badgeClassName,
          )}
        >
          <Text
            className={clsx(
              "font-sans-semibold text-xs",
              item.badgeTextClassName,
            )}
          >
            {getBadge()}
          </Text>
        </View>
      </View>

      <View>
        <Text
          className="font-sans-semibold text-foreground text-lg"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {t(item.titleKey)}
        </Text>

        <Text
          className="text-muted-foreground font-sans text-sm"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {getDescription()}
        </Text>
      </View>
    </Pressable>
  );
};

export default QuickAccessButton;
