import Svg, { Path } from "react-native-svg";

import { TASBIH_PATH } from "../geometry/tasbih-path";

interface TasbihCordProps {
  width?: number;
  height?: number;
}

const TasbihCord = ({ width = 320, height = 520 }: TasbihCordProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 520" fill="none">
      {/* Main cord */}
      <Path
        d={TASBIH_PATH}
        stroke="#E5C158"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default TasbihCord;
