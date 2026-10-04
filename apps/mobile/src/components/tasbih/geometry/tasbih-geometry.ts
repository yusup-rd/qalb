import { BEAD_COUNT, SAMPLES_PER_SEGMENT } from "@/constants/tasbih";
import { BezierSegment, TASBIH_SEGMENTS } from "./tasbih-path";

export interface TasbihPoint {
  x: number;
  y: number;
}

interface SamplePoint extends TasbihPoint {
  distance: number;
}

const cubicPoint = (segment: BezierSegment, t: number): [number, number] => {
  const { p0, p1, p2, p3 } = segment;
  const mt = 1 - t;

  return [
    mt ** 3 * p0[0] +
      3 * mt ** 2 * t * p1[0] +
      3 * mt * t ** 2 * p2[0] +
      t ** 3 * p3[0],

    mt ** 3 * p0[1] +
      3 * mt ** 2 * t * p1[1] +
      3 * mt * t ** 2 * p2[1] +
      t ** 3 * p3[1],
  ];
};

const buildSamples = (): SamplePoint[] => {
  const samples: SamplePoint[] = [];
  let totalDistance = 0;

  TASBIH_SEGMENTS.forEach((segment) => {
    for (let i = 0; i <= SAMPLES_PER_SEGMENT; i++) {
      const t = i / SAMPLES_PER_SEGMENT;
      const [x, y] = cubicPoint(segment, t);

      if (samples.length > 0) {
        const previous = samples[samples.length - 1];

        totalDistance += Math.hypot(x - previous.x, y - previous.y);
      }

      samples.push({
        x,
        y,
        distance: totalDistance,
      });
    }
  });

  return samples;
};

const getPointAtDistance = (
  samples: SamplePoint[],
  distance: number,
): TasbihPoint => {
  const totalLength = samples[samples.length - 1].distance;

  const normalizedDistance =
    ((distance % totalLength) + totalLength) % totalLength;

  for (let i = 1; i < samples.length; i++) {
    const current = samples[i];

    if (current.distance >= normalizedDistance) {
      const previous = samples[i - 1];
      const segmentLength = current.distance - previous.distance;

      if (segmentLength === 0) {
        return {
          x: current.x,
          y: current.y,
        };
      }

      const progress = (normalizedDistance - previous.distance) / segmentLength;

      return {
        x: previous.x + (current.x - previous.x) * progress,
        y: previous.y + (current.y - previous.y) * progress,
      };
    }
  }

  return {
    x: samples[0].x,
    y: samples[0].y,
  };
};

export interface TasbihLayout {
  gap: TasbihPoint;
  beads: TasbihPoint[];
}

export const getTasbihLayout = (): TasbihLayout => {
  const samples = buildSamples();
  const totalLength = samples[samples.length - 1].distance;

  // The Imame sits at the bottom-center of the cord.
  const imameDistance = totalLength / 2;

  /*
   * 33 real beads + 1 invisible gap + 1 Imame.
   *
   * All positions use the same spacing so the gap behaves
   * exactly like one normal bead position.
   */
  const spacing = totalLength / (BEAD_COUNT + 2);

  /*
   * Initial layout:
   *
   * Imame → GAP → bead 1 → bead 2 → ... → bead 33
   */
  const gapDistance = imameDistance - spacing;

  const gap = getPointAtDistance(samples, gapDistance);

  const beads = Array.from({ length: BEAD_COUNT }, (_, index) => {
    const distance = imameDistance - spacing * (index + 2);

    return getPointAtDistance(samples, distance);
  });

  return {
    gap,
    beads,
  };
};
