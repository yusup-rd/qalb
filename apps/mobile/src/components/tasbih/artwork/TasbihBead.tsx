import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface TasbihBeadProps {
  size?: number;
}

const TasbihBead = ({ size = 72 }: TasbihBeadProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <Defs>
        <LinearGradient
          id="beadGradient"
          x1="14"
          y1="10"
          x2="58"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#F7E9C8" />
          <Stop offset="0.35" stopColor="#E8D09D" />
          <Stop offset="0.7" stopColor="#C9A968" />
          <Stop offset="1" stopColor="#A98245" />
        </LinearGradient>

        <LinearGradient
          id="highlightGradient"
          x1="24"
          y1="18"
          x2="43"
          y2="39"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Soft outer shadow */}
      <Circle cx="36" cy="38" r="27" fill="#000000" opacity={0.16} />

      {/* Main bead */}
      <Circle cx="36" cy="34" r="27" fill="url(#beadGradient)" />

      {/* Subtle inner edge */}
      <Circle
        cx="36"
        cy="34"
        r="23.5"
        stroke="#FFFFFF"
        strokeOpacity={0.14}
        strokeWidth={1.5}
      />

      {/* Natural highlight */}
      <Circle cx="28" cy="25" r="12" fill="url(#highlightGradient)" />
    </Svg>
  );
};

export default TasbihBead;
