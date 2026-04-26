import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t, languages, setLanguage, getLanguage } from '../lib/i18n';
import type { Language } from '../lib/i18n';
import { themes } from '../lib/themes';

export default function SettingsScreen({ navigation }: any) {
  const { colors, themeId, setThemeId, isDarkMode, toggleDarkMode } = useTheme();
  const { logout, role, user } = useAuth();
  const [currentLang, setCurrentLang] = React.useState<Language>(getLanguage());

  const handleLanguageChange = async (lang: Language) => {
    setCurrentLang(lang);
    setLanguage(lang);
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderThemeOption = (theme: typeof themes[0]) => (
    <TouchableOpacity
      key={theme.id}
      style={[
        styles.themeOption,
        { backgroundColor: theme.cardBg, borderColor: themeId === theme.id ? colors.primary : colors.border }
      ]}
      onPress={() => setThemeId(theme.id)}
    >
      <View style={[{ backgroundColor: theme.primary }, styles.themePreview]} />
      <View style={styles.themeInfo}>
        <Text style={[styles.themeName, { color: colors.text }]}>{theme.name}</Text>
        <View style={styles.themeColors}>
          <View style={[styles.colorDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.colorDot, { backgroundColor: theme.secondary }]} />
          <View style={[styles.colorDot, { backgroundColor: theme.accent }]} />
        </View>
      </View>
      {themeId === theme.id && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.profileHeader}>
            <Ionicons name="person-circle" size={52} color={colors.primary} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'User'}</Text>
              <Text style={[styles.profileRole, { color: colors.textSecondary }]}>{role === 'admin' ? t('adminPanel') : t('studentPortal')}</Text>
              {role === 'student' && <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>{(user as any)?.mobile || ''}</Text>}
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>🎨 {t('appearance')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Dark Mode Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={22} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>{t('darkMode')}</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
          </View>
          
          <View style={styles.divider} />
          
          {/* Theme Selection */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="color-palette" size={22} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>{t('theme')}</Text>
            </View>
          </View>
        </View>

        {/* Theme Grid */}
        <View style={styles.themeGrid}>
          {themes.map(renderThemeOption)}
        </View>

        {/* Language Section */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>🌐 {t('language')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {languages.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langOption, { backgroundColor: currentLang === lang.code ? colors.primary + '10' : 'transparent' }]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <Text style={[styles.langName, { color: colors.text }]}>{lang.native}</Text>
              <Text style={[styles.langEnglish, { color: colors.textSecondary }]}>{lang.name}</Text>
              {currentLang === lang.code && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* About Section */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>ℹ️ About</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle" size={22} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Version</Text>
            </View>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="heart" size={22} color={colors.error} />
              <Text style={[styles.settingText, { color: colors.text }]}>Made with ❤️</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#FFF" />
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  content: { padding: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  sectionCard: { borderRadius: 14, borderWidth: 1, marginBottom: 2, overflow: 'hidden' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold' },
  profileRole: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  profileDetail: { fontSize: 12, marginTop: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { fontSize: 15 },
  settingValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: 14, backgroundColor: '#E5E7EB' },
  themeGrid: { paddingBottom: 16 },
  themeOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  themePreview: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  themeInfo: { flex: 1 },
  themeName: { fontSize: 14, fontWeight: '600' },
  themeColors: { flexDirection: 'row', gap: 6, marginTop: 4 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  langOption: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderRadius: 8, marginHorizontal: 4, marginVertical: 2 },
  langName: { fontSize: 15, fontWeight: '600', flex: 1 },
  langEnglish: { fontSize: 13, color: '#64748B' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 20, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  logoutButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
