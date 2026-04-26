import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { getStudents, getAttendance } from '../lib/storage';
import type { Student, AttendanceRecord } from '../lib/types';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths } from 'date-fns';

const milestones = [
  { hours: 10, icon: '🌱', label: 'Getting Started' },
  { hours: 25, icon: '⭐', label: 'Rising Star' },
  { hours: 50, icon: '🔥', label: 'Dedicated Learner' },
  { hours: 100, icon: '🏆', label: 'Century Club' },
  { hours: 250, icon: '💎', label: 'Diamond Mind' },
  { hours: 500, icon: '👑', label: 'Legend' },
  { hours: 1000, icon: '🌟', label: 'Immortal' },
];

export default function Leaderboard({ navigation }: any) {
  const { colors } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  const loadData = useCallback(async () => {
    const [s, a] = await Promise.all([getStudents(), getAttendance()]);
    setStudents(s.filter(st => st.isActive));
    setAttendance(a);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getHoursForPeriod = (studentId: string): number => {
    let filtered: AttendanceRecord[];
    const now = new Date();
    
    if (period === 'week') {
      const weekStart = startOfWeek(now);
      filtered = attendance.filter(a => a.studentId === studentId && new Date(a.date) >= weekStart);
    } else if (period === 'month') {
      const monthStart = startOfMonth(now);
      filtered = attendance.filter(a => a.studentId === studentId && new Date(a.date) >= monthStart);
    } else {
      filtered = attendance.filter(a => a.studentId === studentId);
    }
    
    return Math.round(filtered.reduce((sum, a) => sum + a.totalMinutes, 0) / 60 * 10) / 10;
  };

  const rankedStudents = students
    .map(s => ({ ...s, periodHours: getHoursForPeriod(s.id) }))
    .filter(s => s.periodHours > 0)
    .sort((a, b) => b.periodHours - a.periodHours);

  const getMilestone = (hours: number) => {
    let achieved = milestones[0];
    for (const m of milestones) {
      if (hours >= m.hours) achieved = m;
      else break;
    }
    return achieved;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: '#FEF3C7', color: '#D97706', icon: '🥇' };
    if (rank === 2) return { bg: '#E5E7EB', color: '#6B7280', icon: '🥈' };
    if (rank === 3) return { bg: '#FEE2E2', color: '#DC2626', icon: '🥉' };
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leaderboard')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Period Selector */}
      <View style={[styles.periodBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {[{ key: 'week' as const, label: t('thisWeek') }, { key: 'month' as const, label: t('thisMonth') }, { key: 'all' as const, label: 'All Time' }].map(p => (
          <TouchableOpacity key={p.key} style={[styles.periodChip, { backgroundColor: period === p.key ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.periodText, { color: period === p.key ? '#FFF' : colors.text }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top 3 Podium */}
      {rankedStudents.length >= 3 && (
        <View style={styles.podiumContainer}>
          {/* 2nd Place */}
          <View style={styles.podiumItem}>
            <View style={[styles.podiumAvatar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={styles.podiumEmoji}>🥈</Text>
            </View>
            <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{rankedStudents[1]?.name}</Text>
            <Text style={[styles.podiumHours, { color: colors.textSecondary }]}>{rankedStudents[1]?.periodHours}h</Text>
            <View style={[styles.podiumStand, { backgroundColor: '#E5E7EB', height: 70 }]} />
          </View>
          
          {/* 1st Place */}
          <View style={styles.podiumItem}>
            <View style={[styles.podiumAvatar, { backgroundColor: colors.cardBg, borderColor: '#D97706', borderWidth: 2 }]}>
              <Text style={styles.podiumEmoji}>🥇</Text>
            </View>
            <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{rankedStudents[0]?.name}</Text>
            <Text style={[styles.podiumHours, { color: colors.warning }]}>{rankedStudents[0]?.periodHours}h</Text>
            <View style={[styles.podiumStand, { backgroundColor: '#FEF3C7', height: 90 }]} />
          </View>
          
          {/* 3rd Place */}
          <View style={styles.podiumItem}>
            <View style={[styles.podiumAvatar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={styles.podiumEmoji}>🥉</Text>
            </View>
            <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{rankedStudents[2]?.name}</Text>
            <Text style={[styles.podiumHours, { color: colors.textSecondary }]}>{rankedStudents[2]?.periodHours}h</Text>
            <View style={[styles.podiumStand, { backgroundColor: '#FEE2E2', height: 50 }]} />
          </View>
        </View>
      )}

      {/* Milestones Reference */}
      <View style={[styles.milestoneSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.milestoneTitle, { color: colors.text }]}>🏅 {t('milestones')}</Text>
        <View style={styles.milestoneRow}>
          {milestones.map(m => (
            <View key={m.hours} style={styles.milestoneItem}>
              <Text style={styles.milestoneIcon}>{m.icon}</Text>
              <Text style={[styles.milestoneHours, { color: colors.textSecondary }]}>{m.hours}h</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Full Rankings List */}
      <FlatList
        data={rankedStudents}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const badge = getRankBadge(index + 1);
          const milestone = getMilestone(item.totalStudyHours);
          return (
            <View style={[styles.rankCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.rankLeft}>
                {badge ? (
                  <View style={[styles.rankBadge, { backgroundColor: badge.bg }]}>
                    <Text style={styles.rankBadgeEmoji}>{badge.icon}</Text>
                  </View>
                ) : (
                  <View style={[styles.rankNumber, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.rankNumberText, { color: colors.textSecondary }]}>#{index + 1}</Text>
                  </View>
                )}
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.rankBatch, { color: colors.textSecondary }]}>{item.batch?.replace('_', ' ') || '-'}</Text>
                </View>
              </View>
              <View style={styles.rankRight}>
                <Text style={[styles.rankHours, { color: colors.primary, fontWeight: 'bold' }]}>{item.periodHours}h</Text>
                <View style={styles.milestoneBadge}>
                  <Text style={styles.milestoneBadgeIcon}>{milestone.icon}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No study data yet</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  periodBar: { flexDirection: 'row', margin: 16, borderRadius: 12, borderWidth: 1, padding: 4 },
  periodChip: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  periodText: { fontSize: 13, fontWeight: '600' },
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  podiumItem: { alignItems: 'center', width: 90, marginHorizontal: 4 },
  podiumAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 6 },
  podiumEmoji: { fontSize: 24 },
  podiumName: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  podiumHours: { fontSize: 13, fontWeight: 'bold' },
  podiumStand: { width: 60, borderTopLeftRadius: 8, borderTopRightRadius: 8, marginTop: 6 },
  milestoneSection: { marginHorizontal: 16, marginTop: 12, marginBottom: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  milestoneTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-around' },
  milestoneItem: { alignItems: 'center' },
  milestoneIcon: { fontSize: 18 },
  milestoneHours: { fontSize: 10, color: '#64748B', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 40 },
  rankCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  rankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rankBadgeEmoji: { fontSize: 20 },
  rankNumber: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rankNumberText: { fontSize: 12, fontWeight: '700' },
  rankInfo: {},
  rankName: { fontSize: 14, fontWeight: '700' },
  rankBatch: { fontSize: 11, marginTop: 1 },
  rankRight: { alignItems: 'flex-end' },
  rankHours: { fontSize: 17 },
  milestoneBadge: { marginTop: 2 },
  milestoneBadgeIcon: { fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15 },
});
