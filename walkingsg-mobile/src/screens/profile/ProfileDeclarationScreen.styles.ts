import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Profile Declaration */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  profileDeclaration_innerWrap: {
    padding: 16,
    gap: 14,
  },
  profileDeclaration_innerNotice: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    lineHeight: 18,
  },
  profileDeclaration_innerForm: {
    gap: 12,
  },
  profileDeclaration_innerField: {
    gap: 4,
  },
  profileDeclaration_innerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  profileDeclaration_innerInput: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: ThemeColors.lineStrong,
    backgroundColor: ThemeColors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: ThemeColors.ink,
  },
  profileDeclaration_innerCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  profileDeclaration_innerCheckboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: ThemeColors.canopy,
    backgroundColor: ThemeColors.canopy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  profileDeclaration_innerCheckboxText: {
    flex: 1,
    fontSize: 13,
    color: ThemeColors.ink,
    lineHeight: 18,
  },
  profileDeclaration_innerButtonSave: {
    minHeight: 48,
    backgroundColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  profileDeclaration_innerButtonSaveText: {
    color: ThemeColors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
});
/* End Section Profile Declaration */
