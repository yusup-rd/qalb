import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

interface TasbihImameProps {
  width?: number;
  height?: number;
}

const TasbihImame = ({ width = 58, height = 96 }: TasbihImameProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 58 96" fill="none">
      <Defs>
        <LinearGradient
          id="imameGradient"
          x1="13"
          y1="8"
          x2="45"
          y2="87"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFF1C9" />
          <Stop offset="0.3" stopColor="#E8D09D" />
          <Stop offset="0.65" stopColor="#C29B59" />
          <Stop offset="1" stopColor="#967039" />
        </LinearGradient>

        <LinearGradient
          id="imameHighlight"
          x1="17"
          y1="14"
          x2="31"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Soft shadow */}
      <Ellipse cx="30" cy="87" rx="17" ry="4" fill="#000000" opacity={0.05} />

      {/* Main elongated body */}
      <Path
        d="
          M29 5
          C19 5 12 12 12 23
          C12 33 16 40 19 47
          C22 54 21 64 17 73
          C14 80 18 87 29 89
          C40 87 44 80 41 73
          C37 64 36 54 39 47
          C42 40 46 33 46 23
          C46 12 39 5 29 5
          Z
        "
        fill="url(#imameGradient)"
      />

      {/* Upper rounded cap */}
      <Ellipse cx="29" cy="20" rx="16" ry="14" fill="#E4C88D" opacity={0.45} />

      {/* Main highlight */}
      <Path
        d="
          M21 12
          C16 16 16 24 18 31
          C20 37 23 39 25 35
          C27 31 26 24 28 18
          C29 13 25 10 21 12
          Z
        "
        fill="url(#imameHighlight)"
      />

      {/* Decorative groove */}
      <Path
        d="M17 43 C23 47 35 47 41 43"
        stroke="#FFF4D6"
        strokeOpacity={0.3}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* Lower groove */}
      <Path
        d="M18 68 C24 72 34 72 40 68"
        stroke="#7C5C2F"
        strokeOpacity={0.3}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default TasbihImame;
