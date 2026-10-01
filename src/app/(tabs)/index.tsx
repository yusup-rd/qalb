import AyahCard from "@/components/home/AyahCard";
import DateWithLocation from "@/components/home/DateWithLocation";
import HeroCountdown from "@/components/home/HeroCountdown";
import PrayersToday from "@/components/home/PrayersToday";
import QuickAccess from "@/components/home/QuickAccess";
import SpiritualPauseCard from "@/components/home/SpiritualPauseCard";
import ErrorCard from "@/components/ui/ErrorCard";
import LoadingCard from "@/components/ui/LoadingCard";
import PrayerTimeSettingsSheet from "@/components/ui/prayer-settings/PrayerTimeSettingsSheet";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { usePrayerTimeSettings } from "@/hooks/usePrayerTimeSettings";
import { useLocationStore } from "@/store/locationStore";
import { styled } from "nativewind";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  AppState,
  type AppStateStatus,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const Index = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "home" });

  const prayerTimes = usePrayerTimes();
  const locationLoading = useLocationStore((state) => state.locationLoading);
  const locationError = useLocationStore((state) => state.locationError);
  const locationPermissionStatus = useLocationStore(
    (state) => state.locationPermissionStatus,
  );
  const retryLocation = useLocationStore((state) => state.retryLocation);

  const {
    visible: prayerSettingsVisible,
    selectedPrayer,
    selectedPrayerNotification,
    selectedPrayerAdjustment,
    open: openPrayerSettings,
    close: closePrayerSettings,
    handleNotificationEnabledChange,
    handleNotificationMinutesChange,
    handleAdjustmentChange,
  } = usePrayerTimeSettings();

  const previousAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasInactive =
        previousAppState.current === "inactive" ||
        previousAppState.current === "background";

      const returnedToApp = wasInactive && nextAppState === "active";

      if (returnedToApp && locationPermissionStatus === "blocked") {
        void retryLocation();
      }

      previousAppState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [locationPermissionStatus, retryLocation]);

  const renderLocationContent = () => {
    if (locationLoading) {
      return (
        <LoadingCard
          title={t("loading.title")}
          message={t("loading.message")}
        />
      );
    }

    if (locationError) {
      const isBlocked = locationPermissionStatus === "blocked";

      const handleLocationAction = async () => {
        if (isBlocked) {
          await Linking.openSettings();
          return;
        }

        await retryLocation();
      };

      return (
        <ErrorCard
          title={
            locationPermissionStatus === "blocked"
              ? t("locationError.permissionBlockedTitle")
              : t("locationError.unavailableTitle")
          }
          message={locationError ?? t("locationError.unavailableMessage")}
          actionLabel={
            locationPermissionStatus === "blocked"
              ? t("locationError.openSettings")
              : t("locationError.tryAgain")
          }
          onActionPress={handleLocationAction}
        />
      );
    }

    return (
      <>
        <DateWithLocation />

        <HeroCountdown
          previousPrayer={prayerTimes.previousPrayer}
          nextPrayer={prayerTimes.nextPrayer}
          countdown={prayerTimes.countdown}
          elapsedPercent={prayerTimes.elapsedPercent}
          solarEvent={prayerTimes.solarEvent}
        />

        <PrayersToday
          prayers={prayerTimes.prayers}
          sunriseEvent={prayerTimes.sunriseEvent}
          isSunriseCompleted={prayerTimes.isSunriseCompleted}
          onPrayerPress={openPrayerSettings}
        />
      </>
    );
  };

  return (
    <>
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 p-5"
          showsVerticalScrollIndicator={false}
        >
          {renderLocationContent()}
          <QuickAccess />
          <SpiritualPauseCard />
          <AyahCard />
        </ScrollView>
      </SafeAreaView>

      <PrayerTimeSettingsSheet
        visible={prayerSettingsVisible}
        prayer={selectedPrayer}
        enabled={selectedPrayerNotification?.enabled ?? false}
        minutesBefore={selectedPrayerNotification?.minutesBefore ?? 10}
        adjustment={selectedPrayerAdjustment}
        onEnabledChange={handleNotificationEnabledChange}
        onMinutesBeforeChange={handleNotificationMinutesChange}
        onAdjustmentChange={handleAdjustmentChange}
        onClose={closePrayerSettings}
      />
    </>
  );
};

export default Index;
