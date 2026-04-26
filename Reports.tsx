import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { getStudents, getFees, getPayments, getAttendance, getSeats } from '../lib/storage';
import type { Student, FeeRecord, Payment, AttendanceRecord, Seat } from '../lib/types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

const { width } = Dimensions.get('window');

export default function Reports({ navigation }: any) {
  const { colors } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [activeTab, setActiveTab] = useState<'revenue' | 'occupancy' | 'students'>('revenue');

  const loadData = useCallback(async () => {
    const [s, f, p, a, st] = await Promise.all([getStudents(), getFees(), getPayments(), getAttendance(), getSeats()]);
    setStudents(s); setFees(f); setPayments(p); setAttendance(a); setSeats(st);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Revenue Stats
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  
  const pendingAmount = fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);
  const overdueCount = fees.filter(f => f.status === 'overdue').length;

  // Occupancy Stats
  const occupiedSeats = seats.filter(s => !s.isLabel && (s.morningStudentId || s.eveningStudentId || s.fullDayStudentId)).length;
  const totalSeatsCount = seats.filter(s => !s.isLabel).length;
  const occupancyRate = totalSeatsCount > 0 ? Math.round((occupiedSeats / totalSeatsCount) * 100) : 0;

  // Student Stats
  const activeStudents = students.filter(s => s.isActive).length;
  const totalStudyHours = Math.round(attendance.reduce((sum, a) => sum + a.totalMinutes, 0) / 60);
  const avgHoursPerStudent = activeStudents > 0 ? Math.round(totalStudyHours / activeStudents * 10) / 0 : 0;

  // Monthly revenue chart data
  const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
  const monthlyData = months.map(m => {
    const monthPayments = payments.filter(p => {
      const pd = new Date(p.date);
      return pd.getMonth() === m.getMonth() && pd.getFullYear() === m.getFullYear();
    });
    return {
      month: format(m, 'MMM'),
      amount: monthPayments.reduce((sum, p) => sum + p.amount, 0),
    };
  });
  const maxMonthAmount = Math.max(...monthlyData.map(m => m.amount), 1);

  const tabs = [
    { key: 'revenue' as const, label: 'Revenue', icon: 'wallet' },
    { key: 'occupancy' as const, label: 'Occupancy', icon: 'business' },
    { key: 'students' as const, label: 'Students', icon: 'people' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('viewReports')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tab, { backgroundColor: activeTab === tab.key ? colors.primary + '15' : 'transparent' }]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'revenue' && (
        <FlatList
          data={[1]}
          contentContainerStyle={styles.listContent}
          keyExtractor={() => 'rev'}
          renderItem={() => (
            <>
              {/* Summary Cards */}
              <View styles={styles.statsGrid} style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>₹{totalRevenue.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Collection</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>₹{monthlyRevenue.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.error }]}>₹{pendingAmount.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Dues</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{overdueCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue Accounts</Text>
                </View>
              </View>

              {/* Chart */}
              <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Revenue Trend</Text>
                {monthlyData.map((m, i) => (
                  <View key={i} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{m.month}</Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.barFill, { width: `${(m.amount / maxMonthAmount) * 100}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.barAmt, { color: colors.text }]}>₹{(m.amount / 1000).toFixed(1)}k</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        />
      )}

      {activeTab === 'occupancy' && (
        <FlatList
          data={[1]}
          contentContainerStyle={styles.listContent}
          keyExtractor={() => 'occ'}
          renderItem={() => (
            <>
              <View style={styles.statsGrid}>
                <View style={[styles.bigStatCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.bigStatValue, { color: colors.primary }]}>{occupancyRate}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Occupancy Rate</Text>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${occupancyRate}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
                <View style={[styles.bigStatCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.bigStatValue, { color: colors.success }]}>{occupiedSeats}/{totalSeatsCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Seats Occupied</Text>
                </View>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Seat Status Breakdown</Text>
                {[
                  { label: 'Available', count: seats.filter(s => !s.isLabel && !s.morningStudentId && !s.eveningStudentId && !s.fullDayStudentId).length, color: colors.success },
                  { label: 'Reserved (Full)', count: seats.filter(s => s.fullDayStudentId).length, color: colors.error },
                  { label: 'Partial (M/E)', count: seats.filter(s => (s.morningStudentId && !s.fullDayStudentId) || (s.eveningStudentId && !s.fullDayStudentId)).length, color: colors.warning },
                  { label: 'Maintenance', count: seats.filter(s => s.status === 'maintenance').length, color: colors.textSecondary },
                ].map((item, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.breakdownLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.breakdownCount, { color: colors.text }]}>{item.count}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        />
      )}

      {activeTab === 'students' && (
        <FlatList
          data={students.filter(s => s.isActive)}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const studentAttendance = attendance.filter(a => a.studentId === item.id);
            const totalHrs = Math.round(studentAttendance.reduce((sum, a) => sum + a.totalMinutes, 0) / 60);
            const studentFee = fees.find(f => f.studentId === item.id && f.status !== 'paid');
            return (
              <View style={[styles.studentRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Ionicons name="person-circle" size={36} color={colors.textSecondary} />
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>{item.batch?.replace('_', ' ')} • {item.mobile}</Text>
                </View>
                <View style={styles.studentStats}>
                  <Text style={[styles.studentHours, { color: colors.primary }]}>{totalHrs}h</Text>
                  <Text style={[styles.feeStatus, { color: studentFee ? (studentFee.status === 'overdue' ? colors.error : colors.warning) : colors.success }]}>
                    {studentFee ? studentFee.status.toUpperCase() : 'PAID'}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  tabBar: { flexDirection: 'row', margin: 16, borderRadius: 14, borderWidth: 1, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: (width - 52) / 2, borderRadius: 14, padding: 16, borderWidth: 1, alignItems: 'center' },
  bigStatCard: { width: (width - 42) / 2, borderRadius: 14, padding: 16, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  bigStatValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 6 },
  progressBar: { width: '100%', height: 8, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  chartCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#0F172A' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 40, fontSize: 12, fontWeight: '600', color: '#64748B' },
  barTrack: { flex: 1, height: 24, borderRadius: 12, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', borderRadius: 12, minWidth: 4 },
  barAmt: { width: 60, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14, color: '#0F172A' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  breakdownDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  breakdownLabel: { flex: 1, fontSize: 14, color: '#334155' },
  breakdownCount: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  studentRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  studentInfo: { flex: 1, marginLeft: 10 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  studentMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  studentStats: { alignItems: 'flex-end' },
  studentHours: { fontSize: 15, fontWeight: 'bold', color: '#2563EB' },
  feeStatus: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
