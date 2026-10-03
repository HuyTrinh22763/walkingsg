import { StyleSheet } from 'react-native';
import { ThemeColors } from '../constants/theme';

/* Section Top Bar Header */
export const styles = StyleSheet.create({
  topBarHeader: {
    height: 52,
    backgroundColor: ThemeColors.card,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  topBarHeader_innerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarHeader_innerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  topBarHeader_innerRightAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
/* End Section Top Bar Header */
