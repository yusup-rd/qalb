import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

interface TasbihTasselProps {
  width?: number;
  height?: number;
}

const TasbihTassel = ({ width = 76, height = 150 }: TasbihTasselProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 76 150" fill="none">
      <Defs>
        <LinearGradient
          id="tasselCollar"
          x1="20"
          y1="0"
          x2="56"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFF1C9" />
          <Stop offset="0.45" stopColor="#D8B978" />
          <Stop offset="1" stopColor="#967039" />
        </LinearGradient>

        <LinearGradient
          id="tasselThread"
          x1="20"
          y1="25"
          x2="56"
          y2="145"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#E8D09D" />
          <Stop offset="0.45" stopColor="#C19A59" />
          <Stop offset="1" stopColor="#967039" />
        </LinearGradient>
      </Defs>

      {/* Tassel strands */}
      <Path
        d="M24 31 C21 55 20 86 23 132"
        stroke="url(#tasselThread)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Path
        d="M29 32 C27 62 28 101 29 143"
        stroke="url(#tasselThread)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Path
        d="M35 33 C34 67 35 108 35 137"
        stroke="url(#tasselThread)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Path
        d="M41 33 C42 66 41 105 42 145"
        stroke="url(#tasselThread)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Path
        d="M47 32 C50 61 48 94 50 136"
        stroke="url(#tasselThread)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Path
        d="M52 31 C56 58 54 88 53 128"
        stroke="url(#tasselThread)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* Fine highlights */}
      <Path
        d="M24 36 C22 66 22 91 24 119"
        stroke="#FFF4D6"
        strokeOpacity={0.3}
        strokeWidth={1}
        strokeLinecap="round"
      />

      <Path
        d="M35 37 C34 70 35 102 35 124"
        stroke="#FFF4D6"
        strokeOpacity={0.25}
        strokeWidth={1}
        strokeLinecap="round"
      />

      <Path
        d="M47 36 C49 63 48 91 50 116"
        stroke="#FFF4D6"
        strokeOpacity={0.2}
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Collar */}
      <Path
        d="
          M21 18
          C25 14 51 14 55 18
          L58 28
          C51 34 25 34 18 28
          Z
        "
        fill="url(#tasselCollar)"
      />

      {/* Collar grooves */}
      <Path
        d="M21 21 C29 25 47 25 55 21"
        stroke="#FFF4D6"
        strokeOpacity={0.38}
        strokeWidth={1.5}
      />

      <Path
        d="M20 26 C29 30 47 30 56 26"
        stroke="#76582E"
        strokeOpacity={0.25}
        strokeWidth={1.5}
      />

      {/* Connector */}
      <Path d="M38 0 C34 8 34 13 38 19 C42 13 42 8 38 0Z" fill="#C29B59" />
    </Svg>
  );
};

export default TasbihTassel;
