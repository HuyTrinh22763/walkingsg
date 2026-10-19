import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Auth Reset */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  authReset_innerWrap: {
    flexGrow: 1,
    padding: 24,
  },
  authReset_innerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  authReset_innerBrandText: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authReset_innerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ThemeColors.canopyTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authReset_innerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  authReset_innerDesc: {
    fontSize: 14,
    color: ThemeColors.inkSoft,
    lineHeight: 22,
    marginBottom: 16,
  },
  authReset_innerResendButton: {
    minHeight: 48,
    backgroundColor: ThemeColors.paper2,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  authReset_innerResendButtonText: {
    color: ThemeColors.canopyInk,
    fontSize: 15,
    fontWeight: '700',
  },
  authReset_innerCountdownText: {
    fontSize: 13,
    color: ThemeColors.inkFaint,
    marginTop: 8,
    textAlign: 'center',
  },
  authReset_innerField: {
    marginBottom: 16,
  },
  authReset_innerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.ink,
    marginBottom: 6,
  },
  authReset_innerInput: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: ThemeColors.ink,
  },
  authReset_innerOtpInput: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: ThemeColors.canopyInk,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    color: ThemeColors.ink,
    marginBottom: 8,
  },
  authReset_innerSubmitButton: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopyInk,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  authReset_innerSubmitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  authReset_innerBackLink: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.ink,
    marginTop: 24,
    textAlign: 'center',
  },
});
/* End Section Auth Reset */
