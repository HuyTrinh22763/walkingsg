import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Profile Preferences */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  profilePreferences_innerWrap: {
    padding: 16,
    gap: 14,
  },
  profilePreferences: {
    flex: 1,
    gap: 14,
  },
  profilePreferences_innerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  profilePreferences_innerSub: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginBottom: 4,
  },
  profilePreferences_innerDeclarationCard: {
    backgroundColor: ThemeColors.card,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profilePreferences_innerCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  profilePreferences_innerReviewLink: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.canopy,
  },
  profilePreferences_innerGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profilePreferences_innerFieldHalf: {
    flex: 1,
    gap: 6,
  },
  profilePreferences_innerField: {
    gap: 6,
  },
  profilePreferences_innerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  profilePreferences_innerInput: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    backgroundColor: ThemeColors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: ThemeColors.ink,
  },
  profilePreferences_innerPickerBtn: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    backgroundColor: ThemeColors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profilePreferences_innerPickerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  profilePreferences_innerSliderBox: {
    backgroundColor: ThemeColors.card,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profilePreferences_innerSliderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profilePreferences_innerSliderVal: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
  },
  profilePreferences_innerRangeInput: {
    width: '100%',
    height: 40,
  },
  profilePreferences_innerSegmentGroup: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.paper2,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    borderRadius: 10,
    padding: 4,
    gap: 6,
  },
  profilePreferences_innerSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePreferences_innerSegmentBtn_active: {
    backgroundColor: ThemeColors.canopy,
  },
  profilePreferences_innerSegmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.inkSoft,
  },
  profilePreferences_innerSegmentText_active: {
    color: '#ffffff',
  },
  profilePreferences_innerButtonSave: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  profilePreferences_innerButtonSaveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
/* End Section Profile Preferences */
