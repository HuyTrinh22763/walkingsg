import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Auth Register */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  authRegister_innerWrap: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  authRegister_innerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authRegister_innerBrandText: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authRegister_innerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  authRegister_innerForm: {
    gap: 16,
  },
  authRegister_innerField: {
    gap: 6,
  },
  authRegister_innerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authRegister_innerInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  authRegister_innerInput: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    backgroundColor: ThemeColors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: ThemeColors.ink,
  },
  authRegister_innerTogglePwd: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  authRegister_innerCriteriaList: {
    gap: 8,
    marginVertical: 4,
  },
  authRegister_innerCriteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authRegister_innerCriteriaText: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
  },
  authRegister_innerCriteriaText_met: {
    color: ThemeColors.canopyInk,
    fontWeight: '600',
  },
  authRegister_innerButtonSubmit: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  authRegister_innerButtonSubmitText: {
    color: ThemeColors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  authRegister_innerFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
  authRegister_innerFooterText: {
    fontSize: 14,
    color: ThemeColors.inkSoft,
  },
  authRegister_innerLink: {
    color: ThemeColors.canopyInk,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Modal OTP */
  authRegister_innerModalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34, 31, 24, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  authRegister_innerModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: ThemeColors.card,
    borderRadius: 16,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: ThemeColors.lineStrong,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  authRegister_innerModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authRegister_innerModalDesc: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    lineHeight: 18,
  },
  authRegister_innerOtpInput: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: ThemeColors.canopy,
    backgroundColor: ThemeColors.paper2,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    color: ThemeColors.ink,
  },
  authRegister_innerModalExpiry: {
    fontSize: 12,
    color: ThemeColors.inkFaint,
    textAlign: 'center',
  },
  authRegister_innerModalActions: {
    gap: 10,
    marginTop: 4,
  },
  authRegister_innerModalBtnVerify: {
    minHeight: 44,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRegister_innerModalBtnVerifyText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  authRegister_innerModalBtnCancel: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRegister_innerModalBtnCancelText: {
    color: ThemeColors.inkSoft,
    fontSize: 14,
    fontWeight: '600',
  },
  /* End Modal OTP */
});
/* End Section Auth Register */
