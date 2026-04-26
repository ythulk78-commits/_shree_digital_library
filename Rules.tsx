import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rules = [
  { id: 1, text: t('rule1'), icon: 'volume-mute' },
  { id: 2, text: t('rule2'), icon: 'phone-portrait' },
  { id: 3, text: t('rule3'), icon: 'person' },
  { id: 4, text: t('rule4'), icon: 'sparkles' },
  { id: 5, text: t('rule5'), icon: 'book' },
  { id: 6, text: t('rule6'), icon: 'restaurant' },
  { id: 7, text: t('rule7'), icon: 'alert-circle' },
  { id: 8, text: t('rule8'), icon: 'card' },
  { id: 9, text: t('rule9'), icon: 'people' },
  { id: 10, text: t('rule10'), icon: 'school' },
];

export default function RulesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    setIsStudent(role === 'student');
    // Check if already accepted
    AsyncStorage.getItem(`@rules_accepted_${user?.id}`).then(val => {
      if (val === 'true') setAccepted(true);
    });
  }, [role, user?.id]);

  const handleAccept = async () => {
    setAccepted(true);
    await AsyncStorage.setItem(`@rules_accepted_${user?.id}`, 'true');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('libraryRulesTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={[styles.introCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.introEmoji]}>📖</Text>
          <Text style={[styles.introTitle, { color: colors.text }]}>{t('libraryRulesTitle')}</Text>
          <Text style={[styles.introDesc, { color: colors.textSecondary }]}>
            Please read and follow these rules to maintain a peaceful learning environment for everyone.
          </Text>
        </View>

        {/* Rules List */}
        {rules.map((rule, index) => (
          <View key={rule.id} style={[styles.ruleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.ruleNumber, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.ruleNumberText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <View style={styles.ruleContent}>
              <Ionicons name={rule.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.ruleText, { color: colors.text }]}>{rule.text}</Text>
            </View>
          </View>
        ))}

        {/* Accept Button for Students */}
        {isStudent && !accepted && (
          <TouchableOpacity style={[styles.acceptButton, { backgroundColor: colors.primary }]} onPress={handleAccept}>
            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
            <Text style={styles.acceptButtonText}>{t('acceptRules')}</Text>
          </TouchableOpacity>
        )}

        {isStudent && accepted && (
          <View style={[styles.acceptedBox, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
            <Ionicons name="checkmark-done" size={24} color={colors.success} />
            <Text style={[styles.acceptedText, { color: colors.success }]}>You have accepted the library rules</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF', flex: 1, marginLeft: 8 },
  content: { padding: 20, paddingTop: 16 },
  introCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  introEmoji: { fontSize: 48, marginBottom: 12 },
  introTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  introDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  ruleCard: { flexDirection: 'row', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 10, alignItems: 'center' },
  ruleNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  ruleNumberText: { fontSize: 14, fontWeight: 'bold' },
  ruleContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleText: { fontSize: 14, flex: 1, lineHeight: 19 },
  acceptButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  acceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  acceptedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  acceptedText: { fontSize: 15, fontWeight: '600' },
});
