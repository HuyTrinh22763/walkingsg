import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Feed Report */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  feedReport_innerWrap: {
    padding: 16,
    paddingBottom: 32,
  },
  feedReport_innerHeader: {
    marginBottom: 16,
  },
  feedReport_innerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.3,
  },
  feedReport_innerSub: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginTop: 3,
  },
  feedReport_innerOptionsList: {
    gap: 10,
    marginBottom: 18,
  },
  feedReport_innerOptionCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ThemeColors.line,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedReport_innerOptionCard_selected: {
    borderColor: ThemeColors.canopy,
    backgroundColor: ThemeColors.canopyTint,
  },
  feedReport_innerOptionTextCol: {
    flex: 1,
    paddingRight: 12,
    gap: 3,
  },
  feedReport_innerOptionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  feedReport_innerOptionDesc: {
    fontSize: 12,
    color: ThemeColors.inkSoft,
    lineHeight: 16,
  },
  feedReport_innerRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: ThemeColors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  feedReport_innerRadioCircle_selected: {
    borderColor: ThemeColors.canopy,
  },
  feedReport_innerRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ThemeColors.canopy,
  },
  feedReport_innerButtonSubmit: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  feedReport_innerButtonSubmit_disabled: {
    opacity: 0.45,
  },
  feedReport_innerButtonSubmitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  feedReport_innerNotice: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginBottom: 12,
  },
  feedReport_innerError: {
    fontSize: 13,
    color: ThemeColors.hazard,
    marginBottom: 12,
  },
});
/* End Section Feed Report */
