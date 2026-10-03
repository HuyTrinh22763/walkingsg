import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Auth Login */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  authLogin_innerWrap: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  authLogin_innerTop: {
    gap: 16,
  },
  authLogin_innerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  authLogin_innerBrandText: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authLogin_innerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  authLogin_innerDesc: {
    fontSize: 14,
    color: ThemeColors.inkSoft,
    lineHeight: 20,
    marginBottom: 8,
  },
  authLogin_innerForm: {
    gap: 14,
  },
  authLogin_innerField: {
    gap: 6,
  },
  authLogin_innerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authLogin_innerInput: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    backgroundColor: ThemeColors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: ThemeColors.ink,
  },
  authLogin_innerButtonSubmit: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  authLogin_innerButtonSubmitText: {
    color: ThemeColors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  authLogin_innerFooterLinks: {
    marginTop: 20,
    gap: 12,
  },
  authLogin_innerFooterText: {
    fontSize: 14,
    color: ThemeColors.inkSoft,
  },
  authLogin_innerLink: {
    color: ThemeColors.canopyInk,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  authLogin_innerForgotLink: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
  },
});
/* End Section Auth Login */
