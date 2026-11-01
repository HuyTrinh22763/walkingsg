import { StyleSheet } from 'react-native';
import { Radii, ThemeColors } from '../../constants/theme';

export const WHEEL_ITEM_HEIGHT = 40;
export const WHEEL_VISIBLE_ROWS = 5;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
export const WHEEL_SPACER_HEIGHT = WHEEL_ITEM_HEIGHT * 2;

/* Section Auth Onboarding */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  authOnboarding_innerKeyboard: {
    flex: 1,
  },
  authOnboarding_innerWrap: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
    gap: 20,
  },
  authOnboarding_innerTop: {
    gap: 16,
  },
  authOnboarding_innerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authOnboarding_innerBrandText: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authOnboarding_innerHeaderBlock: {
    gap: 6,
  },
  authOnboarding_innerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  authOnboarding_innerDesc: {
    fontSize: 14,
    color: ThemeColors.inkSoft,
    lineHeight: 20,
  },
  authOnboarding_innerFormCard: {
    backgroundColor: ThemeColors.card,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    borderRadius: Radii.card,
    padding: 16,
    gap: 18,
    shadowColor: '#221f18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  authOnboarding_innerField: {
    gap: 6,
  },
  authOnboarding_innerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authOnboarding_innerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  authOnboarding_innerHint: {
    fontSize: 12,
    color: ThemeColors.inkFaint,
  },
  authOnboarding_innerInput: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    backgroundColor: ThemeColors.ground,
    borderRadius: Radii.control,
    paddingHorizontal: 14,
    fontSize: 15,
    color: ThemeColors.ink,
  },
  authOnboarding_innerAgeBadge: {
    backgroundColor: ThemeColors.canopyTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.badge,
  },
  authOnboarding_innerAgeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
  },
  authOnboarding_innerWheelHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  authOnboarding_innerWheelColHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  authOnboarding_innerWheelBox: {
    position: 'relative',
    height: WHEEL_HEIGHT,
    backgroundColor: ThemeColors.ground,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    borderRadius: Radii.control,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  authOnboarding_innerWheelHighlight: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: WHEEL_SPACER_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    backgroundColor: ThemeColors.canopyTint,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ThemeColors.canopy,
  },
  authOnboarding_innerWheelColumn: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  authOnboarding_innerWheelScrollContent: {
    paddingVertical: WHEEL_SPACER_HEIGHT,
  },
  authOnboarding_innerWheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authOnboarding_innerWheelItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: ThemeColors.inkFaint,
  },
  authOnboarding_innerWheelItemText_active: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.canopyInk,
  },
  authOnboarding_innerSummaryText: {
    fontSize: 12,
    color: ThemeColors.inkSoft,
    textAlign: 'center',
  },
  authOnboarding_innerButtonSubmit: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopy,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authOnboarding_innerButtonSubmitText: {
    color: ThemeColors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
});
/* End Section Auth Onboarding */

