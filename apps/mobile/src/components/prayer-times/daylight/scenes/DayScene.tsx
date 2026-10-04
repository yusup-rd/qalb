import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Cloud from "../elements/Cloud";
import Sun from "../elements/Sun";
import SunTrajectory from "../elements/SunTrajectory";

interface DaySceneProps {
  progress: number;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 180;

const DayScene = ({ progress }: DaySceneProps) => {
  const [sceneWidth, setSceneWidth] = useState(0);

  const sceneScale = sceneWidth > 0 ? sceneWidth / VIEWBOX_WIDTH : 1;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;

    if (width !== sceneWidth) {
      setSceneWidth(width);
    }
  };

  return (
    <View
      onLayout={handleLayout}
      style={{
        width: "100%",
        aspectRatio: VIEWBOX_WIDTH / VIEWBOX_HEIGHT,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#79C9F1",
      }}
    >
      {/* Sky */}
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <Defs>
          <LinearGradient id="daySkyGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#70C5F0" />
            <Stop offset="1" stopColor="#B9E7F8" />
          </LinearGradient>
        </Defs>

        <Path d="M0 0H320V180H0Z" fill="url(#daySkyGradient)" />
      </Svg>

      {sceneWidth > 0 && (
        <>
          {/* Clouds */}
          <Cloud
            x={-8}
            y={27}
            scale={0.88}
            distance={16}
            duration={5200}
            opacity={0.88}
            sceneScale={sceneScale}
          />

          <Cloud
            x={116}
            y={66}
            scale={0.62}
            distance={-13}
            duration={6900}
            opacity={0.7}
            sceneScale={sceneScale}
          />

          <Cloud
            x={226}
            y={27}
            scale={0.76}
            distance={19}
            duration={6100}
            opacity={0.84}
            sceneScale={sceneScale}
          />

          <Cloud
            x={176}
            y={116}
            scale={0.5}
            distance={-11}
            duration={7600}
            opacity={0.5}
            sceneScale={sceneScale}
          />

          <Cloud
            x={-18}
            y={112}
            scale={0.55}
            distance={14}
            duration={6500}
            opacity={0.46}
            sceneScale={sceneScale}
          />

          <SunTrajectory sceneScale={sceneScale} />

          <Sun progress={progress} sceneScale={sceneScale} />
        </>
      )}
    </View>
  );
};

export default DayScene;
