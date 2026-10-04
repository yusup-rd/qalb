import { memo } from "react";
import { useTranslation } from "react-i18next";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import QiblaMarker from "./QiblaMarker";

interface CompassDialProps {
  size: number;
  color: string;
  mutedColor: string;
  cardColor: string;
  qiblaBearing: number;
  qiblaColor: string;
}

const DIRECTIONS = [
  { key: "n", angle: 0 },
  { key: "ne", angle: 45 },
  { key: "e", angle: 90 },
  { key: "se", angle: 135 },
  { key: "s", angle: 180 },
  { key: "sw", angle: 225 },
  { key: "w", angle: 270 },
  { key: "nw", angle: 315 },
] as const;

const LABEL_ROTATIONS: Record<number, number> = {
  0: 0,
  45: 45,
  90: 90,
  135: 135,
  180: 180,
  225: 225,
  270: -90,
  315: -45,
};

const CompassDial = ({
  size,
  color,
  mutedColor,
  cardColor,
  qiblaBearing,
  qiblaColor,
}: CompassDialProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "compass",
  });

  const center = size / 2;
  const outerRadius = center - 7;
  const rimRadius = outerRadius - 5;
  const innerRadius = rimRadius - 8;
  const labelRadius = innerRadius - 29;
  const majorTickOuter = rimRadius - 3;
  const majorTickInner = majorTickOuter - 13;
  const intercardinalTickOuter = rimRadius - 4;
  const intercardinalTickInner = intercardinalTickOuter - 8;
  const minorTickOuter = rimRadius - 5;
  const minorTickInner = minorTickOuter - 4;

  const polarPoint = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;

    return {
      x: center + Math.sin(radians) * radius,
      y: center - Math.cos(radians) * radius,
    };
  };

  return (
    <Svg width={size} height={size}>
      {/* Soft dimensional outer shadow */}
      <Circle
        cx={center}
        cy={center + 2}
        r={outerRadius}
        fill={color}
        opacity={0.07}
      />

      {/* Outer illustrated rim */}
      <Circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill={cardColor}
        stroke={color}
        strokeWidth={1}
        opacity={0.95}
      />

      {/* Inner rim */}
      <Circle
        cx={center}
        cy={center}
        r={rimRadius}
        fill={color}
        opacity={0.08}
      />

      {/* Flat compass surface */}
      <Circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill={cardColor}
        stroke={mutedColor}
        strokeWidth={1}
        opacity={0.98}
      />

      {/* Inner decorative ring */}
      <Circle
        cx={center}
        cy={center}
        r={innerRadius - 10}
        fill="none"
        stroke={mutedColor}
        strokeWidth={0.8}
        opacity={0.38}
      />

      {/* Minor 5° markings */}
      <G opacity={0.32}>
        {Array.from({ length: 72 }, (_, index) => {
          const angle = index * 5;

          if (angle % 45 === 0) {
            return null;
          }

          const start = polarPoint(angle, minorTickInner);
          const end = polarPoint(angle, minorTickOuter);

          return (
            <Line
              key={`minor-${angle}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={mutedColor}
              strokeWidth={1}
              strokeLinecap="round"
            />
          );
        })}
      </G>

      {/* Intercardinal markings */}
      {DIRECTIONS.map(({ angle }) => {
        if (angle % 90 === 0) {
          return null;
        }

        const start = polarPoint(angle, intercardinalTickInner);
        const end = polarPoint(angle, intercardinalTickOuter);

        return (
          <Line
            key={`intercardinal-${angle}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={mutedColor}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.75}
          />
        );
      })}

      {/* Cardinal markings */}
      {DIRECTIONS.map(({ angle, key }) => {
        if (angle % 90 !== 0) {
          return null;
        }

        const start = polarPoint(angle, majorTickInner);
        const end = polarPoint(angle, majorTickOuter);

        return (
          <G key={`cardinal-${key}`}>
            <Line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth={3.5}
              strokeLinecap="round"
            />

            <Circle cx={start.x} cy={start.y} r={2.2} fill={color} />
          </G>
        );
      })}

      {/* Direction labels */}
      {DIRECTIONS.map(({ key, angle }) => {
        const radians = (angle * Math.PI) / 180;
        const x = center + Math.sin(radians) * labelRadius;
        const y = center - Math.cos(radians) * labelRadius;
        const isCardinal = angle % 90 === 0;
        const isNorth = key === "n";

        return (
          <G key={key}>
            {isNorth && (
              <Circle cx={x} cy={y} r={13} fill={color} opacity={0.09} />
            )}

            <SvgText
              x={x}
              y={y}
              fill={isNorth ? color : mutedColor}
              fontSize={isNorth ? 16 : isCardinal ? 13 : 12}
              fontWeight={isNorth ? "700" : "600"}
              letterSpacing={isNorth ? 0 : 0.2}
              textAnchor="middle"
              alignmentBaseline="middle"
              transform={`rotate(${LABEL_ROTATIONS[angle]} ${x} ${y})`}
            >
              {t(key)}
            </SvgText>
          </G>
        );
      })}

      {/* Large symmetrical abstract center */}
      <G>
        {/* Soft center halo */}
        <Circle cx={center} cy={center} r={43} fill={color} opacity={0.035} />

        {/* Main vertical / horizontal petals */}
        <Path
          d={`
            M ${center} ${center - 39}
            C ${center + 7} ${center - 32},
              ${center + 13} ${center - 19},
              ${center} ${center}
            C ${center - 13} ${center - 19},
              ${center - 7} ${center - 32},
              ${center} ${center - 39}
            Z

            M ${center + 39} ${center}
            C ${center + 32} ${center + 7},
              ${center + 19} ${center + 13},
              ${center} ${center}
            C ${center + 19} ${center - 13},
              ${center + 32} ${center - 7},
              ${center + 39} ${center}
            Z

            M ${center} ${center + 39}
            C ${center - 7} ${center + 32},
              ${center - 13} ${center + 19},
              ${center} ${center}
            C ${center + 13} ${center + 19},
              ${center + 7} ${center + 32},
              ${center} ${center + 39}
            Z

            M ${center - 39} ${center}
            C ${center - 32} ${center - 7},
              ${center - 19} ${center - 13},
              ${center} ${center}
            C ${center - 19} ${center + 13},
              ${center - 32} ${center + 7},
              ${center - 39} ${center}
            Z
          `}
          fill={color}
          opacity={0.18}
        />

        {/* Diagonal petals */}
        <Path
          d={`
            M ${center + 27.5} ${center - 27.5}
            C ${center + 20} ${center - 25},
              ${center + 10} ${center - 15},
              ${center} ${center}
            C ${center + 15} ${center - 10},
              ${center + 25} ${center - 20},
              ${center + 27.5} ${center - 27.5}
            Z

            M ${center + 27.5} ${center + 27.5}
            C ${center + 25} ${center + 20},
              ${center + 15} ${center + 10},
              ${center} ${center}
            C ${center + 10} ${center + 15},
              ${center + 20} ${center + 25},
              ${center + 27.5} ${center + 27.5}
            Z

            M ${center - 27.5} ${center + 27.5}
            C ${center - 20} ${center + 25},
              ${center - 10} ${center + 15},
              ${center} ${center}
            C ${center - 15} ${center + 10},
              ${center - 25} ${center + 20},
              ${center - 27.5} ${center + 27.5}
            Z

            M ${center - 27.5} ${center - 27.5}
            C ${center - 25} ${center - 20},
              ${center - 15} ${center - 10},
              ${center} ${center}
            C ${center - 10} ${center - 15},
              ${center - 20} ${center - 25},
              ${center - 27.5} ${center - 27.5}
            Z
          `}
          fill={mutedColor}
          opacity={0.34}
        />

        {/* Inner eight-point compass star */}
        <Path
          d={`
            M ${center} ${center - 27}
            L ${center + 7} ${center - 7}
            L ${center + 27} ${center}
            L ${center + 7} ${center + 7}
            L ${center} ${center + 27}
            L ${center - 7} ${center + 7}
            L ${center - 27} ${center}
            L ${center - 7} ${center - 7}
            Z
          `}
          fill={color}
          opacity={0.78}
        />

        {/* Inner cutout */}
        <Circle cx={center} cy={center} r={11} fill={cardColor} />

        {/* Central jewel */}
        <Circle cx={center} cy={center} r={7} fill={color} />

        {/* Jewel highlight */}
        <Circle
          cx={center - 2}
          cy={center - 2}
          r={2.2}
          fill={cardColor}
          opacity={0.55}
        />
      </G>

      <QiblaMarker
        center={center}
        radius={outerRadius}
        bearing={qiblaBearing}
        accentColor={qiblaColor}
        badgeColor={cardColor}
      />
    </Svg>
  );
};

export default memo(CompassDial);
