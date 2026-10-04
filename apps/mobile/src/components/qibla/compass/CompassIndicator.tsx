import Svg, { Circle, Path } from "react-native-svg";

interface CompassIndicatorProps {
  size: number;
  color: string;
  cardColor: string;
}

const CompassIndicator = ({
  size,
  color,
  cardColor,
}: CompassIndicatorProps) => {
  const center = size / 2;

  return (
    <Svg
      pointerEvents="none"
      width={size}
      height={size}
      style={{ position: "absolute" }}
    >
      {/* Pointer shadow */}
      <Path
        d={`
          M ${center} 10
          C ${center + 7} 10, ${center + 8} 14, ${center + 7} 18
          L ${center + 5} 29
          L ${center} 24
          L ${center - 5} 29
          L ${center - 7} 18
          C ${center - 8} 14, ${center - 7} 10, ${center} 10
          Z
        `}
        fill={color}
        opacity={0.12}
        transform="translate(0 2)"
      />

      {/* Main pointer */}
      <Path
        d={`
          M ${center} 7
          C ${center + 6.5} 7, ${center + 7.5} 11.5, ${center + 6.5} 16
          L ${center + 5} 27
          L ${center} 22
          L ${center - 5} 27
          L ${center - 6.5} 16
          C ${center - 7.5} 11.5, ${center - 6.5} 7, ${center} 7
          Z
        `}
        fill={color}
      />

      {/* Small pointer highlight */}
      <Path
        d={`
          M ${center} 10
          C ${center + 2} 10, ${center + 2.5} 11.5, ${center + 2} 14
          L ${center + 1} 19
          L ${center} 17
          Z
        `}
        fill={cardColor}
        opacity={0.3}
      />

      {/* Center cap */}
      <Circle
        cx={center}
        cy={center}
        r={6}
        fill={cardColor}
        stroke={color}
        strokeWidth={2}
      />

      {/* Tiny center highlight */}
      <Circle
        cx={center - 1.5}
        cy={center - 1.5}
        r={1.5}
        fill={color}
        opacity={0.35}
      />
    </Svg>
  );
};

export default CompassIndicator;
