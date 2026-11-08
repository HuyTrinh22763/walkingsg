import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Route Options */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  routeOptions_innerWrap: {
    padding: 16,
    paddingBottom: 28,
  },
  routeOptions_innerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  routeOptions_innerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.3,
  },
  routeOptions_innerSub: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginTop: 2,
  },
  routeOptions_innerSortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: ThemeColors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
  },
  routeOptions_innerSortBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  routeOptions_innerWeatherCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  routeOptions_innerWeatherCard_rain: {
    backgroundColor: ThemeColors.infoTint,
    borderColor: ThemeColors.info,
  },
  routeOptions_innerWeatherCard_hot: {
    backgroundColor: ThemeColors.cautionTint,
    borderColor: ThemeColors.caution,
  },
  routeOptions_innerWeatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeOptions_innerWeatherTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  routeOptions_innerWeatherTextCol: {
    flex: 1,
    gap: 2,
  },
  routeOptions_innerWeatherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  routeOptions_innerWeatherMsg: {
    fontSize: 12,
    color: ThemeColors.inkSoft,
    lineHeight: 16,
  },
  routeOptions_innerWeatherRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  routeOptions_innerDemoToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: ThemeColors.paper2,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
  },
  routeOptions_innerDemoToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.inkSoft,
  },
  routeOptions_innerSimRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: ThemeColors.line,
  },
  routeOptions_innerSimChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: ThemeColors.card,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
    marginTop: 6,
  },
  routeOptions_innerSimChip_active: {
    backgroundColor: ThemeColors.canopy,
    borderColor: ThemeColors.canopy,
  },
  routeOptions_innerSimChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.inkSoft,
  },
  routeOptions_innerSimChipText_active: {
    color: ThemeColors.onAccent,
  },
  routeOptions_innerList: {
    gap: 12,
  },
  routeOptions_innerRouteCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ThemeColors.line,
    padding: 14,
    gap: 8,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  routeOptions_innerRouteCard_featured: {
    borderColor: ThemeColors.canopy,
    backgroundColor: '#faf8f2',
  },
  routeOptions_innerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeOptions_innerCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  routeOptions_innerCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  routeOptions_innerMatchBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
    backgroundColor: ThemeColors.canopyTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routeOptions_innerMetrics: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    fontWeight: '600',
  },
  routeOptions_innerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  routeOptions_innerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeOptions_innerBadge_green: {
    backgroundColor: ThemeColors.canopyTint,
  },
  routeOptions_innerBadge_amber: {
    backgroundColor: ThemeColors.cautionTint,
  },
  routeOptions_innerBadge_red: {
    backgroundColor: ThemeColors.hazardTint,
  },
  routeOptions_innerBadge_neutral: {
    backgroundColor: ThemeColors.paper2,
  },
  routeOptions_innerBadgeText_green: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
  },
  routeOptions_innerBadgeText_amber: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.caution,
  },
  routeOptions_innerBadgeText_red: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.hazard,
  },
  routeOptions_innerBadgeText_neutral: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.inkSoft,
  },
});
/* End Section Route Options */
