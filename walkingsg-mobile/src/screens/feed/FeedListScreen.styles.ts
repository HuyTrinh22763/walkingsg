import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/theme';

/* Section Feed List */
export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: ThemeColors.ground,
  },
  feedList_innerWrap: {
    padding: 16,
    paddingBottom: 28,
  },
  feedList_innerHeader: {
    marginBottom: 12,
  },
  feedList_innerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: ThemeColors.ink,
    letterSpacing: -0.3,
  },
  feedList_innerSub: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginTop: 2,
  },
  feedList_innerStatus: {
    fontSize: 13,
    color: ThemeColors.inkSoft,
    marginBottom: 14,
  },
  feedList_innerStatus_error: {
    color: ThemeColors.hazard,
  },
  feedList_innerEntries: {
    backgroundColor: ThemeColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ThemeColors.line,
    overflow: 'hidden',
    marginBottom: 16,
  },
  feedList_innerEntry: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.line,
    gap: 8,
  },
  feedList_innerEntry_expanded: {
    backgroundColor: ThemeColors.paper2,
  },
  feedList_innerEntry_last: {
    borderBottomWidth: 0,
  },
  feedList_innerEntryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedList_innerEntryTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  feedList_innerEntryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.ink,
  },
  feedList_innerEntryRightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedList_innerEntryTime: {
    fontSize: 11,
    color: ThemeColors.inkFaint,
    fontWeight: '600',
  },
  feedList_innerEntryChevron: {
    fontSize: 10,
    color: ThemeColors.inkSoft,
  },
  feedList_innerEntryDetails: {
    borderTopWidth: 1,
    borderTopColor: ThemeColors.line,
    paddingTop: 10,
    gap: 6,
  },
  feedList_innerEntryDesc: {
    fontSize: 13,
    color: ThemeColors.ink,
    lineHeight: 19,
  },
  feedList_innerEntryTimestamp: {
    fontSize: 11,
    color: ThemeColors.inkSoft,
    fontWeight: '600',
  },
  feedList_innerButtonReport: {
    minHeight: 46,
    backgroundColor: ThemeColors.card,
    borderWidth: 1.5,
    borderColor: ThemeColors.canopy,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedList_innerButtonReportText: {
    color: ThemeColors.canopy,
    fontSize: 15,
    fontWeight: '700',
  },
});
/* End Section Feed List */
