import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { ThemeColors } from '../constants/theme';

// Section Map Vector Canvas
interface MapCanvasProps {
  isOutOfBounds?: boolean;
}

export function MapVectorCanvas({ isOutOfBounds = false }: MapCanvasProps) {
  if (isOutOfBounds) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 360 600" preserveAspectRatio="xMidYMid slice">
          <Rect width="360" height="600" fill={ThemeColors.mapLand} />
          {/* Dashed Singapore Coverage Boundary */}
          <Rect
            x="24"
            y="160"
            width="312"
            height="380"
            rx="14"
            fill="none"
            stroke={ThemeColors.hazard}
            strokeWidth="2.5"
            strokeDasharray="6, 6"
          />
          {/* Street Grid & Buildings */}
          <Rect x="50" y="240" width="70" height="60" rx="4" fill={ThemeColors.mapBldg} />
          <Rect x="150" y="240" width="70" height="60" rx="4" fill={ThemeColors.mapBldg} />
          <Rect x="50" y="320" width="70" height="60" rx="4" fill={ThemeColors.mapBldg} />
          <Rect x="150" y="320" width="70" height="60" rx="4" fill={ThemeColors.mapBldg} />
          <Path d="M24 440 C 90 400 180 430 336 410 L 336 540 L 24 540 Z" fill={ThemeColors.mapPark} />
          {/* Rejected Pin Placement Outside Boundary */}
          <Circle cx="180" cy="290" r="14" fill={ThemeColors.hazardTint} stroke={ThemeColors.hazard} strokeWidth="1.5" />
          <Path d="M180 282 c-3.3 0-6 2.7-6 6 0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6z" fill={ThemeColors.hazard} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 360 600" preserveAspectRatio="xMidYMid slice">
        <Rect width="360" height="600" fill={ThemeColors.mapLand} />
        {/* Rochor Canal */}
        <Path
          d="M280 -10 C 290 100 240 180 270 290 C 295 380 250 480 290 610 L 370 610 L 370 -10 Z"
          fill={ThemeColors.mapWater}
          stroke={ThemeColors.mapWaterEdge}
          strokeWidth="2"
        />
        {/* Parkland & Canopy */}
        <Path d="M-10 380 C 70 340 140 380 190 360 C 250 330 270 400 270 450 L 270 620 L -10 620 Z" fill={ThemeColors.mapPark} />
        <Circle cx="80" cy="140" r="65" fill={ThemeColors.mapPark} />
        <Rect x="170" y="80" width="80" height="70" rx="12" fill={ThemeColors.mapPark} />

        {/* Tree clusters */}
        <Circle cx="50" cy="110" r="4" fill={ThemeColors.mapTree} />
        <Circle cx="95" cy="98" r="4.5" fill={ThemeColors.mapTree} />
        <Circle cx="65" cy="160" r="4" fill={ThemeColors.mapTree} />
        <Circle cx="110" cy="150" r="5" fill={ThemeColors.mapTree} />
        <Circle cx="40" cy="490" r="4" fill={ThemeColors.mapTree} />
        <Circle cx="70" cy="520" r="4.5" fill={ThemeColors.mapTree} />
        <Circle cx="105" cy="480" r="4" fill={ThemeColors.mapTree} />
        <Circle cx="140" cy="510" r="5" fill={ThemeColors.mapTree} />

        {/* Road Edges */}
        <G stroke={ThemeColors.mapRoadEdge} fill="none" strokeLinecap="round">
          <Path d="M-10 230 H370" strokeWidth="22" />
          <Path d="M-10 330 C 100 300 170 360 370 330" strokeWidth="16" />
          <Path d="M125 -10 V 620" strokeWidth="20" />
          <Path d="M50 -10 V 230 M50 330 V 620" strokeWidth="12" />
          <Path d="M210 -10 V 230 M210 330 V 550" strokeWidth="12" />
          <Path d="M-10 140 H 125 M210 140 H 280" strokeWidth="11" />
          <Path d="M125 500 H 370" strokeWidth="14" />
        </G>

        {/* Road Fill */}
        <G stroke={ThemeColors.mapRoad} fill="none" strokeLinecap="round">
          <Path d="M-10 230 H370" strokeWidth="16" />
          <Path d="M-10 330 C 100 300 170 360 370 330" strokeWidth="11" />
          <Path d="M125 -10 V 620" strokeWidth="14" />
          <Path d="M50 -10 V 230 M50 330 V 620" strokeWidth="8" />
          <Path d="M210 -10 V 230 M210 330 V 550" strokeWidth="8" />
          <Path d="M-10 140 H 125 M210 140 H 280" strokeWidth="7" />
          <Path d="M125 500 H 370" strokeWidth="9" />
        </G>

        {/* Buildings */}
        <Rect x="140" y="150" width="30" height="34" rx="3" fill={ThemeColors.mapBldg} />
        <Rect x="175" y="160" width="34" height="25" rx="3" fill={ThemeColors.mapBldg2} />
        <Rect x="140" y="190" width="68" height="34" rx="3" fill={ThemeColors.mapBldg} />
        <Rect x="10" y="255" width="28" height="32" rx="3" fill={ThemeColors.mapBldg} />
        <Rect x="65" y="255" width="45" height="30" rx="3" fill={ThemeColors.mapBldg2} />
        <Rect x="230" y="150" width="38" height="30" rx="3" fill={ThemeColors.mapBldg2} />

        {/* MRT Station Badge */}
        <Circle cx="125" cy="425" r="7.5" fill={ThemeColors.card} stroke={ThemeColors.mapMrt} strokeWidth="3.5" />
        <SvgText x="125" y="428" fontSize="8" fontWeight="bold" textAnchor="middle" fill={ThemeColors.mapMrt}>M</SvgText>

        {/* Planned Route (Green dotted) */}
        <Path
          d="M110 470 L110 330 C 110 285 124 260 125 230 L 125 140 L 170 110"
          fill="none"
          stroke={ThemeColors.canopy}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0.5, 11"
        />
        <Circle cx="125" cy="230" r="4.5" fill={ThemeColors.canopy} />

        {/* Street Name Labels */}
        <SvgText x="170" y="224" fontSize="9" fontWeight="bold" fill={ThemeColors.inkFaint}>Bencoolen St</SvgText>
        <SvgText x="135" y="475" fontSize="9" fontWeight="bold" fill={ThemeColors.inkFaint}>Park Connector</SvgText>
      </Svg>
    </View>
  );
}
// End Section Map Vector Canvas
