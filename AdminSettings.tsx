import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { getSettings, saveSettings, addActivityLog } from '../lib/storage';
import type { LibrarySettings } from '../lib/types';

export default function AdminSettings({ navigation }: any) {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const updateSetting = (key: keyof LibrarySettings, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    setLoading(true);
    try {
      await saveSettings(settings);
      await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Updated settings', details: 'Library settings saved' });
      Alert.alert(t('success'), 'Settings saved successfully!');
    } catch (error) {
      Alert.alert(t('error'), 'Failed to save settings');
    }
    setLoading(false);
  };

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{t('libraryInfo')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const inputFields = [
    { section: '📚 Library Information', fields: [
      { key: 'name' as const, label: 'Library Name', icon: 'business', autoCapitalize: 'words' },
      { key: 'address' as const, label: 'Address', icon: 'location', multiline: true },
      { key: 'phone' as const, label: 'Phone Number', icon: 'call', keyboardType: 'phone-pad' },
    ]},
    { section: '💰 Fee Settings', fields: [
      { key: 'defaultFee' as const, label: 'Default Monthly Fee (₹)', icon: 'wallet', keyboardType: 'number-pad' },
      { key: 'gracePeriod' as const, label: 'Grace Period (days)', icon: 'time', keyboardType: 'number-pad' },
    ]},
    { section: '⏰ Timings', fields: [
      { key: 'openTime' as const, label: 'Opening Time', icon: 'sunny' },
      { key: 'closeTime' as const, label: 'Closing Time', icon: 'moon' },
      { key: 'morningStart' as const, label: 'Morning Batch Start', icon: 'sunny-outline' },
      { key: 'morningEnd' as const, label: 'Morning Batch End', icon: 'sunny' },
      { key: 'eveningStart' as const, label: 'Evening Batch Start', icon: 'moon-outline' },
      { key: 'eveningEnd' as const, label: 'Evening Batch End', icon: 'moon' },
    ]},
    { section: '⚙️ Automation', fields: [
      { key: 'autoReleaseDays' as const, label: 'Auto-Release Seat After (days)', icon: 'refresh', keyboardType: 'number-pad' },
    ]},
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('libraryInfo')} & Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {inputFields.map((section, sIdx) => (
          <View key={sIdx} style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.section}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {section.fields.map((field, fIdx) => (
                <View key={field.key}>
                  <View style={styles.inputGroup}>
                    <Ionicons name={field.icon as any} size={18} color={colors.primary} />
                    <View style={styles.inputWrap} style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        value={String(settings[field.key])}
                        onChangeText={(v) => {
                          const numFields = ['defaultFee', 'gracePeriod', 'autoReleaseDays'];
                          updateSetting(field.key, numFields.includes(field.key) ? parseInt(v) || 0 : v);
                        }}
                        keyboardType={field.keyboardType as any}
                        autoCapitalize={field.autoCapitalize as any || 'none'}
                        multiline={field.multiline}
                        numberOfLines={field.multiline ? 3 : 1}
                      />
                    </View>
                  </View>
                  {fIdx < section.fields.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: loading ? colors.textSecondary : colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Ionicons name="save" size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>{loading ? t('saving') || 'Saving...' : t('save')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  content: { padding: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  inputGroup: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  divider: { height: 1, marginHorizontal: 14 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
