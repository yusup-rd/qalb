import type { PrayerName } from "@/types/prayer";

export type SpiritualPauseType = "morning" | "postPrayer" | "evening" | "night";

export type SpiritualPauseSession =
  | {
      type: "postPrayer";
      prayer: PrayerName;
      sessionId: string;
      date: string;
    }
  | {
      type: "morning" | "evening" | "night";
      prayer: null;
      sessionId: string;
      date: string;
    };

export interface SpiritualPauseProgress {
  counts: number[];
  completed: boolean;
}
