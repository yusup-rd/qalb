export interface BezierSegment {
  p0: readonly [number, number];
  p1: readonly [number, number];
  p2: readonly [number, number];
  p3: readonly [number, number];
}

export const TASBIH_SEGMENTS: BezierSegment[] = [
  {
    p0: [160, 24],
    p1: [215, 22],
    p2: [262, 48],
    p3: [285, 96],
  },
  {
    p0: [285, 96],
    p1: [312, 151],
    p2: [306, 224],
    p3: [283, 286],
  },
  {
    p0: [283, 286],
    p1: [263, 340],
    p2: [271, 396],
    p3: [245, 438],
  },
  {
    p0: [245, 438],
    p1: [225, 470],
    p2: [193, 488],
    p3: [160, 492],
  },
  {
    p0: [160, 492],
    p1: [127, 488],
    p2: [95, 470],
    p3: [75, 438],
  },
  {
    p0: [75, 438],
    p1: [49, 396],
    p2: [57, 340],
    p3: [37, 286],
  },
  {
    p0: [37, 286],
    p1: [14, 224],
    p2: [8, 151],
    p3: [35, 96],
  },
  {
    p0: [35, 96],
    p1: [58, 48],
    p2: [105, 22],
    p3: [160, 24],
  },
];

export const TASBIH_PATH = TASBIH_SEGMENTS.map(
  ({ p0, p1, p2, p3 }) =>
    `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
).join(" ");
