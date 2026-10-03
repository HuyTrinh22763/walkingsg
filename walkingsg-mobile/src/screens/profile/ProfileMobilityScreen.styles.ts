import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Profile Mobility */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  profileMobility_innerWrap: {
    padding: 16,
    paddingBottom: 32,
  },
  profileMobility_innerHeader: {
    marginBottom: 16,
  },
  profileMobility_innerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.3,
  },
  profileMobility_innerSub: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginTop: 4,
    lineHeight: 18,
  },
  profileMobility_innerOptionsList: {
    gap: 12,
    marginBottom: 20,
  },
  profileMobility_innerOptionCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ThemeColors.line,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileMobility_innerOptionCard_selected: {
    borderColor: ThemeColors.canopy,
    backgroundColor: ThemeColors.canopyTint,
  },
  profileMobility_innerOptionTextCol: {
    flex: 1,
    paddingRight: 12,
    gap: 3,
  },
  profileMobility_innerOptionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  profileMobility_innerOptionDesc: {
    fontSize: 12,
    color: ThemeColors.inkSoft,
    lineHeight: 16,
  },
  profileMobility_innerRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: ThemeColors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  profileMobility_innerRadioCircle_selected: {
    borderColor: ThemeColors.canopy,
  },
  profileMobility_innerRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ThemeColors.canopy,
  },
  profileMobility_innerButtonSave: {
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
  profileMobility_innerButtonSaveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
/* End Section Profile Mobility */
