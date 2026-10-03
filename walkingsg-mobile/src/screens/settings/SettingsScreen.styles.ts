import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Settings */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  settings_innerWrap: {
    padding: 16,
    paddingBottom: 40,
    gap: 18,
  },
  settings_innerGroup: {
    gap: 8,
  },
  settings_innerGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  settings_innerCard: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    overflow: 'hidden',
  },
  settings_innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.line,
  },
  settings_innerRow_last: {
    borderBottomWidth: 0,
  },
  settings_innerRowTextCol: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  settings_innerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: ThemeColors.ink,
  },
  settings_innerSub: {
    fontSize: 12,
    color: ThemeColors.inkSoft,
    lineHeight: 16,
  },
  settings_innerVal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settings_innerValText: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.inkSoft,
  },
  settings_innerDangerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.hazard,
  },

  /* Custom Switch */
  settings_innerSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: ThemeColors.paper2,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  settings_innerSwitch_active: {
    backgroundColor: ThemeColors.canopy,
    borderColor: ThemeColors.canopy,
  },
  settings_innerSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  settings_innerSwitchThumb_active: {
    alignSelf: 'flex-end',
  },

  /* Modal Dialog (Logout & Delete Account) */
  settings_innerModalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34, 31, 24, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  settings_innerModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: ThemeColors.card,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    textAlign: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  settings_innerModalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ThemeColors.hazardTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settings_innerModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.ink,
    textAlign: 'center',
  },
  settings_innerModalDesc: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
  },
  settings_innerModalActions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  settings_innerModalBtnDanger: {
    minHeight: 46,
    backgroundColor: ThemeColors.hazard,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settings_innerModalBtnDangerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  settings_innerModalBtnGhost: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settings_innerModalBtnGhostText: {
    color: ThemeColors.inkSoft,
    fontSize: 14,
    fontWeight: '600',
  },
  /* End Modal Dialog */
});
/* End Section Settings */
