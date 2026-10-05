import { getDistanceToKaaba, getQiblaBearing } from "@/lib/qibla-calculations";
import { useLocationStore } from "@/store/locationStore";
import { useMemo } from "react";

const useQiblaBearing = () => {
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);

  return useMemo(() => {
    if (latitude === null || longitude === null) {
      return null;
    }

    return {
      bearing: getQiblaBearing(latitude, longitude),
      distance: getDistanceToKaaba(latitude, longitude),
    };
  }, [latitude, longitude]);
};

export default useQiblaBearing;
