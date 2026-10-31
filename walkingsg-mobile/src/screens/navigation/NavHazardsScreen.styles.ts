import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Nav Hazards */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.mapLand,
  },
  navHazards_innerContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  navHazards_innerTopAlert: {
    margin: 16,
    backgroundColor: ThemeColors.hazardTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ThemeColors.hazard,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  navHazards_innerTopAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.hazard,
  },
  navHazards_innerBottomSheet: {
    backgroundColor: ThemeColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
    padding: 20,
    paddingBottom: 28,
    gap: 14,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  navHazards_innerSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  navHazards_innerAlertsList: {
    gap: 10,
  },
  navHazards_innerAlertItem: {
    backgroundColor: ThemeColors.paper2,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navHazards_innerAlertItem_last: {},
  navHazards_innerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  navHazards_innerItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.ink,
    flex: 1,
  },
  navHazards_innerItemDist_red: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.hazard,
  },
  navHazards_innerItemDist_neutral: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.inkSoft,
  },
  navHazards_innerButtonReroute: {
    minHeight: 46,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHazards_innerButtonRerouteText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  navHazards_innerDismissBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  navHazards_innerDismissText: {
    color: ThemeColors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
});
/* End Section Nav Hazards */
