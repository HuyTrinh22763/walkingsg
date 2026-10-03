import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemeColors } from '../constants/theme';

/* Section OneMapView Styles */
export const oneMapStyles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: ThemeColors.mapLand,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

/** Web-only iframe style — kept as plain object to avoid RN StyleSheet type conflicts */
export const iframeStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  width: '100%',
  height: '100%',
  backgroundColor: ThemeColors.mapLand,
  display: 'flex',
};
/* End Section OneMapView Styles */
