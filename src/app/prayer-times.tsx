import CalendarPicker from "@/components/prayer-times/calendar/CalendarPicker";
import DaylightArc from "@/components/prayer-times/daylight/DaylightArc";
import NightPortions from "@/components/prayer-times/night-portions/NightPortions";
import PrayerCalculationSelector from "@/components/prayer-times/prayer-calculation/PrayerCalculationSelector";
import PrayerCalculationSheet from "@/components/prayer-times/prayer-calculation/PrayerCalculationSheet";
import ScheduledTimes from "@/components/prayer-times/scheduled-prayers/ScheduledTimes";
import ErrorCard from "@/components/ui/ErrorCard";
import LoadingCard from "@/components/ui/LoadingCard";
import PrayerTimeSettingsSheet from "@/components/ui/prayer-settings/PrayerTimeSettingsSheet";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useLocationStore } from "@/store/locationStore";
import { usePrayerStore } from "@/store/prayerStore";
import type {
  AsrMethod,
  CalculationMethodId,
  Prayer,
  PrayerTimeAdjustment,
  SolarEvent,
} from "@/types/prayer";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView } from "react-native";

const PrayerTimes = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes",
  });

  const [calculationSheetVisible, setCalculationSheetVisible] = useState(false);
  const [prayerSettingsVisible, setPrayerSettingsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPrayer, setSelectedPrayer] = useState<
    Prayer | SolarEvent | null
  >(null);
  const [draftCalculationMethod, setDraftCalculationMethod] =
    useState<CalculationMethodId>("mwl");
  const [draftAsrMethod, setDraftAsrMethod] = useState<AsrMethod>("standard");

  const {
    calculationMethod,
    asrMethod,
    prayerNotifications,
    prayerTimeAdjustments,
    setCalculationSettings,
    setPrayerNotification,
    setPrayerTimeAdjustment,
  } = usePrayerStore();

  const {
    latitude,
    longitude,
    locationLoading,
    locationError,
    locationPermissionStatus,
    retryLocation,
  } = useLocationStore();

  const prayerTimes = usePrayerTimes(selectedDate);
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const hasLocation = latitude != null && longitude != null;

  const handleCalculationOpen = () => {
    setDraftCalculationMethod(calculationMethod);
    setDraftAsrMethod(asrMethod);
    setCalculationSheetVisible(true);
  };

  const handleCalculationSave = (
    method: CalculationMethodId,
    asr: AsrMethod,
  ) => {
    setCalculationSettings(method, asr);
    setCalculationSheetVisible(false);
  };

  const handlePrayerPress = (prayer: Prayer | SolarEvent) => {
    setSelectedPrayer(prayer);
    setPrayerSettingsVisible(true);
  };

  const handlePrayerSettingsClose = () => {
    setPrayerSettingsVisible(false);
  };

  const handlePrayerNotificationEnabledChange = (enabled: boolean) => {
    if (!selectedPrayer) {
      return;
    }

    setPrayerNotification(selectedPrayer.name, {
      enabled,
      minutesBefore: prayerNotifications[selectedPrayer.name].minutesBefore,
    });
  };

  const handlePrayerNotificationMinutesChange = (minutes: number) => {
    if (!selectedPrayer) {
      return;
    }

    setPrayerNotification(selectedPrayer.name, {
      enabled: prayerNotifications[selectedPrayer.name].enabled,
      minutesBefore: minutes,
    });
  };

  const handlePrayerAdjustmentChange = (adjustment: PrayerTimeAdjustment) => {
    if (!selectedPrayer || selectedPrayer.name === "Sunrise") {
      return;
    }

    setPrayerTimeAdjustment(selectedPrayer.name, adjustment);
  };

  const handleLocationAction = () => {
    if (locationPermissionStatus === "blocked") {
      void Linking.openSettings();
      return;
    }

    void retryLocation();
  };

  const selectedPrayerNotification = selectedPrayer
    ? prayerNotifications[selectedPrayer.name]
    : null;

  const selectedPrayerAdjustment =
    selectedPrayer && selectedPrayer.name !== "Sunrise"
      ? prayerTimeAdjustments[selectedPrayer.name]
      : null;

  return (
    <>
      <ScrollView
        className="bg-background flex-1"
        contentContainerClassName="gap-5 p-5"
        showsVerticalScrollIndicator={false}
      >
        <PrayerCalculationSelector
          calculationMethod={calculationMethod}
          asrMethod={asrMethod}
          onPress={handleCalculationOpen}
        />

        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {locationLoading ? (
          <LoadingCard
            title={t("loading.title")}
            message={t("loading.message")}
          />
        ) : !hasLocation || locationError ? (
          <ErrorCard
            title={t("locationError.permissionBlockedTitle")}
            message={locationError ?? t("locationError.unavailableTitle")}
            actionLabel={
              locationPermissionStatus === "blocked"
                ? t("locationError.openSettings")
                : t("locationError.tryAgain")
            }
            onActionPress={handleLocationAction}
          />
        ) : prayerTimes.selectedPrayers.length > 0 ? (
          <ScheduledTimes
            selectedDate={selectedDate}
            prayers={prayerTimes.selectedPrayers}
            sunriseEvent={prayerTimes.selectedSunriseEvent}
            isToday={isToday}
            onPrayerPress={handlePrayerPress}
          />
        ) : null}

        {hasLocation &&
          prayerTimes.selectedSunrise &&
          prayerTimes.selectedSunset && (
            <DaylightArc
              sunrise={prayerTimes.selectedSunrise}
              sunset={prayerTimes.selectedSunset}
              now={prayerTimes.now}
              isToday={isToday}
              selectedDate={selectedDate}
            />
          )}

        {hasLocation &&
          prayerTimes.selectedNightSunset &&
          prayerTimes.selectedNextFajr && (
            <NightPortions
              sunset={prayerTimes.selectedNightSunset}
              fajr={prayerTimes.selectedNextFajr}
              now={prayerTimes.now}
              isToday={isToday}
              selectedDate={selectedDate}
            />
          )}
      </ScrollView>

      <PrayerCalculationSheet
        visible={calculationSheetVisible}
        calculationMethod={draftCalculationMethod}
        asrMethod={draftAsrMethod}
        onCalculationMethodChange={setDraftCalculationMethod}
        onAsrMethodChange={setDraftAsrMethod}
        onClose={() => setCalculationSheetVisible(false)}
        onSave={handleCalculationSave}
      />

      <PrayerTimeSettingsSheet
        visible={prayerSettingsVisible}
        prayer={selectedPrayer}
        enabled={selectedPrayerNotification?.enabled ?? false}
        minutesBefore={selectedPrayerNotification?.minutesBefore ?? 10}
        adjustment={selectedPrayerAdjustment}
        onEnabledChange={handlePrayerNotificationEnabledChange}
        onMinutesBeforeChange={handlePrayerNotificationMinutesChange}
        onAdjustmentChange={handlePrayerAdjustmentChange}
        onClose={handlePrayerSettingsClose}
      />
    </>
  );
};

export default PrayerTimes;
