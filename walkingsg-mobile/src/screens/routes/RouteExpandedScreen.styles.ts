import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Route Expanded */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  routeExpanded_innerWrap: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  routeExpanded_innerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeExpanded_innerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.3,
  },
  routeExpanded_innerSub: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginTop: 2,
  },
  routeExpanded_innerBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: ThemeColors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
  },
  routeExpanded_innerBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  routeExpanded_innerCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ThemeColors.canopy,
    padding: 16,
    gap: 12,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  routeExpanded_innerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeExpanded_innerCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routeExpanded_innerCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  routeExpanded_innerMatchBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
    backgroundColor: ThemeColors.canopyTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routeExpanded_innerMetrics: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    fontWeight: '600',
  },
  routeExpanded_innerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  routeExpanded_innerBadgeGreen: {
    backgroundColor: ThemeColors.canopyTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeExpanded_innerBadgeTextGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
  },
  routeExpanded_innerBadgeNeutral: {
    backgroundColor: ThemeColors.paper2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeExpanded_innerBadgeTextNeutral: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.inkSoft,
  },
  routeExpanded_innerBadgeRed: {
    backgroundColor: ThemeColors.hazardTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeExpanded_innerBadgeTextRed: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.hazard,
  },
  routeExpanded_innerFeaturesList: {
    backgroundColor: ThemeColors.paper2,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginVertical: 4,
  },
  routeExpanded_innerFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeExpanded_innerFeatureBullet: {
    fontSize: 14,
    lineHeight: 18,
  },
  routeExpanded_innerFeatureText: {
    flex: 1,
    fontSize: 13,
    color: ThemeColors.ink,
    lineHeight: 18,
  },
  routeExpanded_innerButtonStart: {
    minHeight: 46,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  routeExpanded_innerButtonStartText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  routeExpanded_innerCollapsedCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    padding: 14,
    gap: 6,
    opacity: 0.85,
  },
  routeExpanded_innerCollapsedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
});
/* End Section Route Expanded */
