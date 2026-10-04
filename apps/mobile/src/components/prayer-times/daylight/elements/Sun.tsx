import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

interface SunProps {
  progress: number;
  sceneScale?: number;
}

const START_X = 32;
const END_X = 288;
const BASE_Y = 142;
const CONTROL_X = 160;
const CONTROL_Y = 34;

const SUN_SIZE = 58;

function getSunPosition(progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  const inverse = 1 - t;

  return {
    x:
      inverse * inverse * START_X + 2 * inverse * t * CONTROL_X + t * t * END_X,

    y:
      inverse * inverse * BASE_Y + 2 * inverse * t * CONTROL_Y + t * t * BASE_Y,
  };
}

const Sun = ({ progress, sceneScale = 1 }: SunProps) => {
  const position = getSunPosition(progress);

  const size = SUN_SIZE * sceneScale;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: position.x * sceneScale - size / 2,
        top: position.y * sceneScale - size / 2,
        width: size,
        height: size,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 58 58">
        <Defs>
          <LinearGradient id="sunBodyGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF1A8" />
            <Stop offset="1" stopColor="#F7B83F" />
          </LinearGradient>
        </Defs>

        <Circle cx="29" cy="29" r="27" fill="#FFE28A" opacity={0.12} />

        <Circle cx="29" cy="29" r="22" fill="#FFE28A" opacity={0.16} />

        <Path
          d="
            M29 2V8
            M29 50V56
            M2 29H8
            M50 29H56
            M10 10L14.5 14.5
            M43.5 43.5L48 48
            M48 10L43.5 14.5
            M14.5 43.5L10 48
          "
          fill="none"
          stroke="#F2B63D"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        <Circle cx="29" cy="29" r="14" fill="url(#sunBodyGradient)" />

        <Circle cx="24" cy="24" r="4" fill="#FFF9D8" opacity={0.48} />
      </Svg>
    </View>
  );
};

export default Sun;
