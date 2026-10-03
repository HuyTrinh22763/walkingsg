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
  authReset_innerBackLink: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.ink,
    marginTop: 24,
    textAlign: 'center',
  },
});
/* End Section Auth Reset */
