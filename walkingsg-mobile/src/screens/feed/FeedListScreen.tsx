import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircleIcon, LiftIcon, PondingIcon, ShelterIcon, EscalatorIcon, HazardAlertIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './FeedListScreen.styles';

export default function FeedListScreen({ navigation }: any) {
  // Section Feed List Logic
  const { feedPosts } = useApp();

  const renderIcon = (glyph: string) => {
    switch (glyph) {
      case 'lift': return <LiftIcon size={18} />;
      case 'water': return <PondingIcon size={18} />;
      case 'shelter': return <ShelterIcon size={18} />;
      case 'escalator': return <EscalatorIcon size={18} />;
      default: return <HazardAlertIcon size={18} color="#9c2a20" />;
    }
  };
  // End Section Feed List Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.feedList_innerWrap}>
        {/* Section Feed List */}
        <View style={styles.feedList_innerHeader}>
          <Text style={styles.feedList_innerTitle}>Local Feed</Text>
          <Text style={styles.feedList_innerSub}>Hazards and updates near your routes.</Text>
        </View>

        {/* Confirmation Notification Banner */}
        <View style={styles.feedList_innerSuccessBanner}>
          <CheckCircleIcon size={20} color="#1f6f43" />
          <Text style={styles.feedList_innerSuccessText}>Thanks — your hazard report has been logged.</Text>
        </View>

        {/* Feed Entries List */}
        <View style={styles.feedList_innerEntries}>
          {feedPosts.map((post, idx) => {
            const isLast = idx === feedPosts.length - 1;
            return (
              <View key={post.id} style={[styles.feedList_innerEntry, isLast && styles.feedList_innerEntry_last]}>
                <View style={styles.feedList_innerEntryHead}>
                  <View style={styles.feedList_innerEntryTitleBox}>
                    {renderIcon(post.iconGlyph)}
                    <Text style={styles.feedList_innerEntryTitle}>{post.title}</Text>
                  </View>
                  <Text style={styles.feedList_innerEntryTime}>{post.timeAgo}</Text>
                </View>
                <Text style={styles.feedList_innerEntryDesc}>{post.desc}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.feedList_innerButtonReport}
          onPress={() => navigation.navigate('FeedReport')}
          activeOpacity={0.8}
        >
          <Text style={styles.feedList_innerButtonReportText}>+ Report an Issue</Text>
        </TouchableOpacity>
        {/* End Section Feed List */}
      </ScrollView>
    </SafeAreaView>
  );
}
