import type { PrayerTimeAdjustment } from "@/types/prayer";

export function applyPrayerTimeAdjustment(
  date: Date,
  adjustment: PrayerTimeAdjustment,
) {
  if (adjustment.mode === "offset") {
    const adjustedDate = new Date(date);
    adjustedDate.setMinutes(
      adjustedDate.getMinutes() + adjustment.offsetMinutes,
    );

    return adjustedDate;
  }

  if (adjustment.mode === "fixed" && adjustment.fixedTime) {
    const [hours, minutes] = adjustment.fixedTime.split(":").map(Number);

    if (
      Number.isInteger(hours) &&
      Number.isInteger(minutes) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      const adjustedDate = new Date(date);
      adjustedDate.setHours(hours, minutes, 0, 0);

      return adjustedDate;
    }
  }

  return date;
}
