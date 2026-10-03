import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BackArrowIcon } from './SvgIcons';
import { styles } from './TopBarHeader.styles';

// Section Top Bar Header Component
interface TopBarHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBarHeader({ title, onBack, rightAction }: TopBarHeaderProps) {
  // Section Top Bar Header
  return (
    <View style={styles.topBarHeader}>
      {onBack && (
        <TouchableOpacity
          style={styles.topBarHeader_innerBackButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <BackArrowIcon size={20} />
        </TouchableOpacity>
      )}
      <Text style={styles.topBarHeader_innerTitle}>{title}</Text>
      {rightAction && (
        <View style={styles.topBarHeader_innerRightAction}>
          {rightAction}
        </View>
      )}
    </View>
  );
  // End Section Top Bar Header
}
// End Section Top Bar Header Component
