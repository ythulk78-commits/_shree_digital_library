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
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { getAttendance } from '../lib/storage';
import type { AttendanceRecord, Student } from '../lib/types';
import { format, isToday, isYesterday, startOfWeek, parseISO } from 'date-fns';

export default function MyAttendance({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth() as { user: Student };
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  const loadData = useCallback(async () => {
    const data = await getAttendance();
    const myData = data
      .filter(a => a.studentId === user?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAttendance(myData);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatDate = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEE, dd MMM yyyy');
  };

  let filteredData = attendance;
  if (filter === 'week') {
    const weekStart = startOfWeek(new Date());
    filteredData = attendance.filter(a => new Date(a.date) >= weekStart);
  } else if (filter === 'month') {
    const now = new Date();
    filteredData = attendance.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  const totalMinutes = filteredData.reduce((sum, a) => sum + a.totalMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const avgMinutes = filteredData.length > 0 ? totalMinutes / filteredData.length : 0;
  const daysPresent = filteredData.filter(a => a.checkIn).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('attendance')} Log</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Ionicons name="calendar" size={22} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{daysPresent}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days Present</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Ionicons name="time" size={22} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalHours}h</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Hours</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Ionicons name="stats-chart" size={22} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(avgMinutes)}m</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg/Day</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {[{ key: 'all' as const, label: 'All Time' }, { key: 'week' as const, label: t('thisWeek') }, { key: 'month' as const, label: t('thisMonth') }].map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, { backgroundColor: filter === f.key ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, { color: filter === f.key ? '#FFF' : colors.text }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Attendance List */}
      <FlatList
        data={filteredData}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.attendanceCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.dateSection}>
              <View style={[styles.dateBox, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.dateDay, { color: colors.primary }]}>{new Date(item.date).getDate()}</Text>
                <Text style={[styles.dateMonth, { color: colors.primary }]}>{format(new Date(item.date), 'MMM')}</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={[styles.dateLabel, { color: colors.text }]}>{formatDate(item.date)}</Text>
                {!item.checkIn && <Text style={[styles.absentText, { color: colors.error }]}>Absent</Text>}
              </View>
            </View>
            
            {item.checkIn ? (
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Ionicons name="log-in-outline" size={16} color={colors.success} />
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>In</Text>
                  <Text style={[styles.timeValue, { color: colors.text }]}>{item.checkIn}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color={colors.border} />
                <View style={styles.timeItem}>
                  <Ionicons name="log-out-outline" size={16} color={colors.error} />
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Out</Text>
                  <Text style={[styles.timeValue, { color: colors.text }]}>{item.checkOut || '--:--'}</Text>
                </View>
                <View style={styles.durationBox}>
                  <Text style={[styles.duration, { color: colors.primary }]}>{Math.round(item.totalMinutes / 60)}h {item.totalMinutes % 60}m</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No attendance records</Text>
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
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  filterBar: { flexDirection: 'row', margin: 16, borderRadius: 10, borderWidth: 1, padding: 4 },
  filterChip: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  filterText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  attendanceCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 10 },
  dateSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateBox: { width: 52, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  dateDay: { fontSize: 22, fontWeight: 'bold' },
  dateMonth: { fontSize: 11, fontWeight: '600' },
  dateInfo: {},
  dateLabel: { fontSize: 15, fontWeight: '600' },
  absentText: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  timeLabel: { fontSize: 10, color: '#64748B' },
  timeValue: { fontSize: 13, fontWeight: '600' },
  durationBox: { marginLeft: 'auto', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  duration: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 8, fontSize: 14 },
});
