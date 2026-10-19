import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarHeader } from '../../components/TopBarHeader';
import { ChevronRightIcon, LogoutIcon, TrashIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './SettingsScreen.styles';

export default function SettingsScreen({ navigation }: any) {
  // Section Settings State & Logic
  const { user, logoutUser, deleteAccount } = useApp();

  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logoutUser();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      Alert.alert('Account Deleted', 'Your account and personal data have been purged per Singapore PDPA.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };
  // End Section Settings State & Logic

  // Reusable custom switch component
  const renderSwitch = (value: boolean, onToggle: () => void) => (
    <TouchableOpacity
      style={[styles.settings_innerSwitch, value && styles.settings_innerSwitch_active]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.settings_innerSwitchThumb, value && styles.settings_innerSwitchThumb_active]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screenContainer}>
      <TopBarHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.settings_innerWrap}>
        {/* Section Settings */}

        {/* Group: Account */}
        <View style={styles.settings_innerGroup}>
          <Text style={styles.settings_innerGroupTitle}>Account</Text>
          <View style={styles.settings_innerCard}>
            <View style={styles.settings_innerRow}>
              <Text style={styles.settings_innerLabel}>Signed in</Text>
              <View style={styles.settings_innerVal}>
                <Text style={styles.settings_innerValText}>{user.email || 'you@example.com'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settings_innerRow, styles.settings_innerRow_last]}
              onPress={() => navigation.navigate('ProfileDeclaration')}
              activeOpacity={0.7}
            >
              <View style={styles.settings_innerRowTextCol}>
                <Text style={styles.settings_innerLabel}>Display Name</Text>
                <Text style={styles.settings_innerSub}>Tap to update personal declaration</Text>
              </View>
              <View style={styles.settings_innerVal}>
                <Text style={styles.settings_innerValText}>{user.fullName || 'Not set'}</Text>
                <ChevronRightIcon size={14} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Group: About & Actions */}
        <View style={styles.settings_innerGroup}>
          <Text style={styles.settings_innerGroupTitle}>About</Text>
          <View style={styles.settings_innerCard}>
            <TouchableOpacity
              style={styles.settings_innerRow}
              onPress={() => Alert.alert('Feedback', 'Thank you for helping us improve WalkingSG!')}
              activeOpacity={0.7}
            >
              <Text style={styles.settings_innerLabel}>Send feedback</Text>
              <ChevronRightIcon size={14} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settings_innerRow}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.settings_innerDangerLabel}>Log out</Text>
              <LogoutIcon size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settings_innerRow, styles.settings_innerRow_last]}
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.settings_innerDangerLabel}>Delete account</Text>
              <TrashIcon size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* End Section Settings */}
      </ScrollView>

      {/* Modal Logout */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.settings_innerModalOverlay}>
          <View style={styles.settings_innerModalCard}>
            <View style={styles.settings_innerModalIconBox}>
              <LogoutIcon size={26} color="#9c2a20" />
            </View>
            <Text style={styles.settings_innerModalTitle}>Log out of WalkingSG?</Text>
            <Text style={styles.settings_innerModalDesc}>
              You'll need to sign in again to plan or track routes. Your saved preferences and route history stay on your account.
            </Text>
            <View style={styles.settings_innerModalActions}>
              <TouchableOpacity
                style={styles.settings_innerModalBtnDanger}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <LogoutIcon size={18} color="#ffffff" />
                <Text style={styles.settings_innerModalBtnDangerText}>Log out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settings_innerModalBtnGhost}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.settings_innerModalBtnGhostText}>Stay signed in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End Modal Logout */}

      {/* Modal Delete Account */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.settings_innerModalOverlay}>
          <View style={styles.settings_innerModalCard}>
            <View style={styles.settings_innerModalIconBox}>
              <TrashIcon size={26} color="#9c2a20" />
            </View>
            <Text style={styles.settings_innerModalTitle}>Delete your account?</Text>
            <Text style={styles.settings_innerModalDesc}>
              This will permanently erase your account, preferences, and personal history in accordance with Singapore PDPA right-to-erasure. This action cannot be undone.
            </Text>
            <View style={styles.settings_innerModalActions}>
              <TouchableOpacity
                style={styles.settings_innerModalBtnDanger}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                activeOpacity={0.85}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <TrashIcon size={18} color="#ffffff" />
                    <Text style={styles.settings_innerModalBtnDangerText}>Permanently Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settings_innerModalBtnGhost}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.settings_innerModalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End Modal Delete Account */}
    </SafeAreaView>
  );
}