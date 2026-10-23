import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '../../context/AppContext';
import type { LocationResponse, PointType } from '../../types/location';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

interface LocationFieldProps {
  label: string;
  placeholder: string;
  isSelected: boolean;
  isLocked: boolean;
  initialValue?: string;
  headerAction?: React.ReactNode;
  onSelect: (location: LocationResponse) => Promise<boolean>;
  onClear: () => void;
}

function LocationField({
  label,
  placeholder,
  isSelected,
  isLocked,
  initialValue,
  headerAction,
  onSelect,
  onClear,
}: LocationFieldProps) {
  const { searchLocations } = useApp();
  const [query, setQuery] = useState(initialValue ?? '');
  const [suggestions, setSuggestions] = useState<LocationResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const latestRequest = useRef(0);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (initialValue != null && initialValue !== query) {
      skipNextSearch.current = true;
      setQuery(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const requestId = ++latestRequest.current;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    setHasNoResults(false);
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(trimmed);
        if (requestId === latestRequest.current) {
          setSuggestions(results);
          setHasNoResults(results.length === 0);
        }
      } catch (error) {
        if (requestId === latestRequest.current) {
          setSuggestions([]);
          Alert.alert('Search failed', errorMessage(error));
        }
      } finally {
        if (requestId === latestRequest.current) setIsSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searchLocations]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (isSelected) onClear();
  };

  const handleSelect = async (location: LocationResponse) => {
    latestRequest.current += 1;
    if (location.address_label !== query) skipNextSearch.current = true;
    setQuery(location.address_label);
    setSuggestions([]);
    setIsSearching(false);
    Keyboard.dismiss();
    const isValid = await onSelect(location);
    if (!isValid) setQuery('');
  };

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeaderRow}>
        <Text style={styles.label}>{label}</Text>
        {headerAction}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isSelected && styles.inputSelected]}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          editable={!isLocked}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={label}
        />
        {isSearching && <ActivityIndicator style={styles.inlineSpinner} size="small" />}
      </View>
      {suggestions.length > 0 && (
        <FlatList
          style={styles.suggestions}
          data={suggestions}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item, index) => `${item.address_label}-${item.latitude}-${item.longitude}-${index}`}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              onPress={() => handleSelect(item)}
              disabled={isLocked}
            >
              <Text style={styles.suggestionText}>{item.address_label}</Text>
            </Pressable>
          )}
        />
      )}
      {hasNoResults && !isSelected && (
        <Text style={styles.hint}>No matching places in Singapore. Try a different name or postal code.</Text>
      )}
    </View>
  );
}

interface SearchLocationScreenProps {
  navigation?: any;
  onContinue?: () => void;
}

export default function SearchLocationScreen({ navigation, onContinue }: SearchLocationScreenProps) {
  const {
    origin,
    destination,
    selectLocation,
    clearLocation,
    generateRoutes,
    isRouteLoading,
    useCurrentLocationAsOrigin,
  } = useApp();
  const [validating, setValidating] = useState<PointType | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const isLoading = validating !== null || isRouteLoading || isLocating;
  const canContinue = origin !== null && destination !== null && !isLoading;

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      await useCurrentLocationAsOrigin();
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelect = async (pointType: PointType, location: LocationResponse): Promise<boolean> => {
    setValidating(pointType);
    try {
      const result = await selectLocation(pointType, location);
      if (!result.is_valid) {
        Alert.alert('Invalid location', result.error_message ?? 'Please select a location within Singapore.');
      }
      return result.is_valid;
    } catch (error) {
      Alert.alert('Could not check location', errorMessage(error));
      return false;
    } finally {
      setValidating(null);
    }
  };

  const handleFindRoutes = async () => {
    if (!origin || !destination) return;
    try {
      await generateRoutes(
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      );
      if (onContinue) {
        onContinue();
      } else if (navigation) {
        navigation.navigate('MainTabs', { screen: 'Routes' });
      }
    } catch (error) {
      Alert.alert('Route Generation Failed', errorMessage(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where are you walking?</Text>

      <LocationField
        label="Origin"
        placeholder="Search a place, address or postal code"
        isSelected={origin !== null}
        isLocked={isLoading}
        initialValue={origin?.address_label}
        headerAction={
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={isLoading}
            style={({ pressed }) => [styles.currentLocationBtn, (pressed || isLoading) && { opacity: 0.6 }]}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 4 }} />
            ) : null}
            <Text style={styles.currentLocationBtnText}>📍 Use Current Location</Text>
          </Pressable>
        }
        onSelect={(location) => handleSelect('origin', location)}
        onClear={() => clearLocation('origin')}
      />

      <LocationField
        label="Destination"
        placeholder="Search a place, address or postal code"
        isSelected={destination !== null}
        isLocked={isLoading}
        initialValue={destination?.address_label}
        onSelect={(location) => handleSelect('destination', location)}
        onClear={() => clearLocation('destination')}
      />

      <Pressable
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        onPress={handleFindRoutes}
        disabled={!canContinue}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Find walking routes</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16, color: '#111827' },
  field: { marginBottom: 16, zIndex: 1 },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  currentLocationBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputSelected: { borderColor: '#059669' },
  inlineSpinner: { marginLeft: 8 },
  suggestions: {
    maxHeight: 220,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  suggestion: { paddingHorizontal: 12, paddingVertical: 10 },
  suggestionPressed: { backgroundColor: '#F3F4F6' },
  suggestionText: { fontSize: 14, color: '#111827' },
  hint: { marginTop: 4, fontSize: 12, color: '#6B7280' },
  button: {
    marginTop: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
