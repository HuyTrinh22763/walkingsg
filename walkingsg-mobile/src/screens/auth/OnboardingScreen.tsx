import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles, WHEEL_ITEM_HEIGHT } from './OnboardingScreen.styles';

const MIN_BIRTH_YEAR = 1940;
const DEFAULT_BIRTH_YEAR = 2000;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface WheelOption {
  value: number;
  label: string;
}

interface WheelColumnProps {
  options: WheelOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
  disabled?: boolean;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function calculateAgeFromDob(year: number, month: number, day: number, today: Date): number {
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const hasHadBirthday =
    todayMonth > month || (todayMonth === month && todayDay >= day);
  return Math.max(0, todayYear - year - (hasHadBirthday ? 0 : 1));
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function WheelColumn({ options, selectedValue, onSelect, disabled }: WheelColumnProps) {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const didInitScrollRef = useRef(false);
  const prevLengthRef = useRef(options.length);
  const programmaticUntilRef = useRef(0);

  const selectedIndex = useMemo(() => {
    const idx = options.findIndex((opt) => opt.value === selectedValue);
    return idx >= 0 ? idx : 0;
  }, [options, selectedValue]);

  useEffect(() => {
    if (options.length < prevLengthRef.current && didInitScrollRef.current) {
      programmaticUntilRef.current = Date.now() + 250;
      scrollRef.current?.scrollTo({
        y: selectedIndex * WHEEL_ITEM_HEIGHT,
        animated: true,
      });
    }
    prevLengthRef.current = options.length;
  }, [options.length, selectedIndex]);

  const handleLayout = () => {
    if (didInitScrollRef.current) {
      return;
    }
    didInitScrollRef.current = true;
    programmaticUntilRef.current = Date.now() + 150;
    scrollRef.current?.scrollTo({
      y: selectedIndex * WHEEL_ITEM_HEIGHT,
      animated: false,
    });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < programmaticUntilRef.current || options.length === 0) {
      return;
    }
    const offsetY = event.nativeEvent.contentOffset.y;
    const clampedIndex = Math.max(
      0,
      Math.min(options.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT))
    );
    const nextValue = options[clampedIndex].value;
    if (nextValue !== selectedValue) {
      onSelect(nextValue);
    }
  };

  const handlePressItem = (index: number) => {
    if (disabled || !options[index]) {
      return;
    }
    programmaticUntilRef.current = Date.now() + 300;
    onSelect(options[index].value);
    scrollRef.current?.scrollTo({
      y: index * WHEEL_ITEM_HEIGHT,
      animated: true,
    });
  };

  return (
    <View style={styles.authOnboarding_innerWheelColumn}>
      <ScrollView
        ref={scrollRef}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled={!disabled}
        contentContainerStyle={styles.authOnboarding_innerWheelScrollContent}
      >
        {options.map((option, idx) => {
          const isSelected = option.value === selectedValue;
          return (
            <TouchableOpacity
              key={option.value}
              style={styles.authOnboarding_innerWheelItem}
              onPress={() => handlePressItem(idx)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.authOnboarding_innerWheelItemText,
                  isSelected && styles.authOnboarding_innerWheelItemText_active,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function OnboardingScreen({ navigation }: any) {
  // Section Auth Onboarding State
  const { user, saveProfile } = useApp();
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const [username, setUsername] = useState(user.fullName || '');
  const [selectedYear, setSelectedYear] = useState(
    Math.min(DEFAULT_BIRTH_YEAR, currentYear)
  );
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const yearOptions = useMemo<WheelOption[]>(() => {
    const list: WheelOption[] = [];
    for (let yr = MIN_BIRTH_YEAR; yr <= currentYear; yr += 1) {
      list.push({ value: yr, label: String(yr) });
    }
    return list;
  }, [currentYear]);

  const maxMonth = selectedYear === currentYear ? currentMonth : 12;
  const effectiveMonth = Math.min(selectedMonth, maxMonth);

  const monthOptions = useMemo<WheelOption[]>(() => {
    const list: WheelOption[] = [];
    for (let m = 1; m <= maxMonth; m += 1) {
      list.push({ value: m, label: MONTH_NAMES[m - 1] });
    }
    return list;
  }, [maxMonth]);

  const maxDayInMonth = getDaysInMonth(selectedYear, effectiveMonth);
  const maxDay =
    selectedYear === currentYear && effectiveMonth === currentMonth
      ? Math.min(maxDayInMonth, currentDay)
      : maxDayInMonth;
  const effectiveDay = Math.min(selectedDay, maxDay);

  const dayOptions = useMemo<WheelOption[]>(() => {
    const list: WheelOption[] = [];
    for (let d = 1; d <= maxDay; d += 1) {
      list.push({ value: d, label: String(d).padStart(2, '0') });
    }
    return list;
  }, [maxDay]);

  useEffect(() => {
    if (effectiveMonth !== selectedMonth) {
      setSelectedMonth(effectiveMonth);
    }
  }, [effectiveMonth, selectedMonth]);

  useEffect(() => {
    if (effectiveDay !== selectedDay) {
      setSelectedDay(effectiveDay);
    }
  }, [effectiveDay, selectedDay]);

  const calculatedAge = calculateAgeFromDob(
    selectedYear,
    effectiveMonth,
    effectiveDay,
    today
  );

  const handleContinue = async () => {
    const trimmedName = username.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      Alert.alert(
        'Invalid Username',
        'Please enter a username between 2 and 50 characters.'
      );
      return;
    }

    const isoDob = formatIsoDate(selectedYear, effectiveMonth, effectiveDay);
    setIsSaving(true);
    try {
      await saveProfile({
        fullName: trimmedName,
        age: calculatedAge,
        dateOfBirth: isoDob,
      });
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert(
        'Could not save profile',
        error instanceof Error ? error.message : 'Unable to save your profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };
  // End Section Auth Onboarding State

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={styles.authOnboarding_innerKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.authOnboarding_innerWrap}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section Auth Onboarding */}
          <View style={styles.authOnboarding_innerTop}>
            <View style={styles.authOnboarding_innerBrand}>
              <LeafIcon size={24} />
              <Text style={styles.authOnboarding_innerBrandText}>WalkingSG</Text>
            </View>

            <View style={styles.authOnboarding_innerHeaderBlock}>
              <Text style={styles.authOnboarding_innerTitle}>Welcome! Tell us about you</Text>
              <Text style={styles.authOnboarding_innerDesc}>
                Choose your username and scroll to your date of birth so we can personalise your walking preferences.
              </Text>
            </View>

            <View style={styles.authOnboarding_innerFormCard}>
              {/* Username Prompt */}
              <View style={styles.authOnboarding_innerField}>
                <View style={styles.authOnboarding_innerLabelRow}>
                  <Text style={styles.authOnboarding_innerLabel}>Username</Text>
                  <Text style={styles.authOnboarding_innerHint}>2–50 characters</Text>
                </View>
                <TextInput
                  style={styles.authOnboarding_innerInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your username"
                  placeholderTextColor="#6b6451"
                  autoCapitalize="words"
                  maxLength={50}
                  editable={!isSaving}
                />
              </View>

              {/* Date of Birth Scroll Picker Prompt */}
              <View style={styles.authOnboarding_innerField}>
                <View style={styles.authOnboarding_innerLabelRow}>
                  <Text style={styles.authOnboarding_innerLabel}>Date of birth</Text>
                  <View style={styles.authOnboarding_innerAgeBadge}>
                    <Text style={styles.authOnboarding_innerAgeBadgeText}>
                      Age: {calculatedAge}
                    </Text>
                  </View>
                </View>

                <View style={styles.authOnboarding_innerWheelHeaderRow}>
                  <Text style={styles.authOnboarding_innerWheelColHeader}>Day</Text>
                  <Text style={styles.authOnboarding_innerWheelColHeader}>Month</Text>
                  <Text style={styles.authOnboarding_innerWheelColHeader}>Year</Text>
                </View>

                <View style={styles.authOnboarding_innerWheelBox}>
                  <View
                    style={styles.authOnboarding_innerWheelHighlight}
                    pointerEvents="none"
                  />
                  <WheelColumn
                    options={dayOptions}
                    selectedValue={effectiveDay}
                    onSelect={setSelectedDay}
                    disabled={isSaving}
                  />
                  <WheelColumn
                    options={monthOptions}
                    selectedValue={effectiveMonth}
                    onSelect={setSelectedMonth}
                    disabled={isSaving}
                  />
                  <WheelColumn
                    options={yearOptions}
                    selectedValue={selectedYear}
                    onSelect={setSelectedYear}
                    disabled={isSaving}
                  />
                </View>

                <Text style={styles.authOnboarding_innerSummaryText}>
                  Selected: {String(effectiveDay).padStart(2, '0')} {MONTH_NAMES[effectiveMonth - 1]} {selectedYear} — Age {calculatedAge} will be added to your preference sheet
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.authOnboarding_innerButtonSubmit, isSaving && { opacity: 0.7 }]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.authOnboarding_innerButtonSubmitText}>
                Save & Continue
              </Text>
            )}
          </TouchableOpacity>
          {/* End Section Auth Onboarding */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
