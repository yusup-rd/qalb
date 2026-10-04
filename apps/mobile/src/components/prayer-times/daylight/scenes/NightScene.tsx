import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Cloud from "../elements/Cloud";
import Moon from "../elements/Moon";
import Star from "../elements/Star";

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 180;

const NightScene = () => {
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: VIEWBOX_WIDTH / VIEWBOX_HEIGHT,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#172C59",
      }}
    >
      {/* Night sky */}
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
          <LinearGradient id="nightSkyGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#152A54" />

            <Stop offset="1" stopColor="#304A78" />
          </LinearGradient>
        </Defs>

        <Path d="M0 0H320V180H0Z" fill="url(#nightSkyGradient)" />
      </Svg>

      {/* Stars */}
      <Star x={32} y={27} scale={0.65} duration={1800} delay={100} />

      <Star x={82} y={76} scale={0.42} duration={2300} delay={500} />

      <Star x={143} y={27} scale={0.55} duration={2100} delay={800} />

      <Star x={190} y={76} scale={0.38} duration={1700} delay={300} />

      <Star x={238} y={19} scale={0.62} duration={2500} delay={1100} />

      <Star x={278} y={92} scale={0.48} duration={2000} delay={600} />

      <Star x={122} y={124} scale={0.32} duration={1900} delay={1300} />

      {/* Moon */}
      <Moon />

      {/* Clouds */}
      <Cloud
        x={-12}
        y={52}
        scale={0.72}
        distance={18}
        duration={6800}
        opacity={0.18}
      />

      <Cloud
        x={108}
        y={112}
        scale={0.58}
        distance={-15}
        duration={7600}
        opacity={0.15}
      />

      <Cloud
        x={226}
        y={98}
        scale={0.82}
        distance={14}
        duration={6200}
        opacity={0.2}
      />

      <Cloud
        x={45}
        y={138}
        scale={0.42}
        distance={-10}
        duration={7000}
        opacity={0.12}
      />
    </View>
  );
};

export default NightScene;
