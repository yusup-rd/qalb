import Svg, { Path } from "react-native-svg";

interface SunTrajectoryProps {
  sceneScale?: number;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 180;

const SunTrajectory = ({ sceneScale = 1 }: SunTrajectoryProps) => {
  return (
    <Svg
      pointerEvents="none"
      width={VIEWBOX_WIDTH * sceneScale}
      height={VIEWBOX_HEIGHT * sceneScale}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
      }}
    >
      <Path
        d="
          M32 142
          Q160 34 288 142
        "
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeDasharray="5 7"
        strokeLinecap="round"
        opacity={0.55}
      />
    </Svg>
  );
};

export default SunTrajectory;
