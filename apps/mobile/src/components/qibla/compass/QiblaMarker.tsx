import { Circle, G, Rect } from "react-native-svg";

interface QiblaMarkerProps {
  center: number;
  radius: number;
  bearing: number;
  accentColor: string;
  badgeColor: string;
}

const KAABA_BLACK = "#161616";
const KAABA_GOLD = "#C9A24B";

const QiblaMarker = ({
  center,
  radius,
  bearing,
  accentColor,
  badgeColor,
}: QiblaMarkerProps) => {
  const radians = (bearing * Math.PI) / 180;
  const markerRadius = radius + 25;

  const x = center + Math.sin(radians) * markerRadius;
  const y = center - Math.cos(radians) * markerRadius;

  const badgeSize = 34;
  const half = badgeSize / 2;

  return (
    <G>
      {/* Outer glow */}
      <Rect
        x={x - half - 4}
        y={y - half - 4}
        width={badgeSize + 8}
        height={badgeSize + 8}
        rx={(badgeSize + 8) / 2}
        fill={accentColor}
        opacity={0.15}
      />

      {/* Badge */}
      <Rect
        x={x - half}
        y={y - half}
        width={badgeSize}
        height={badgeSize}
        rx={half}
        fill={badgeColor}
        stroke={accentColor}
        strokeWidth={2}
      />

      {/* Kaaba background */}
      <Circle cx={x} cy={y} r={13} fill={accentColor} opacity={0.3} />

      {/* Kaaba */}
      <G transform={`rotate(-135 ${x} ${y})`}>
        <Rect
          x={x - 8}
          y={y - 9}
          width={16}
          height={18}
          rx={1.5}
          fill={KAABA_BLACK}
        />

        {/* Kiswah band */}
        <Rect x={x - 8} y={y - 3} width={16} height={3.5} fill={KAABA_GOLD} />

        {/* Door */}
        <Rect
          x={x - 2}
          y={y + 2}
          width={4}
          height={5.5}
          rx={0.8}
          fill={KAABA_GOLD}
        />
      </G>
    </G>
  );
};

export default QiblaMarker;
