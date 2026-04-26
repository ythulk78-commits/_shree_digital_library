import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { getStudents, getSeats, getFees, getPayments, getAttendance, getActivityLog, getSettings } from '../lib/storage';
import type { Student, Seat, FeeRecord, Payment, AttendanceRecord, ActivityLog } from '../lib/types';
import { format, isToday, startOfWeek, startOfMonth } from 'date-fns';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        {subtitle && <Text style={[styles.statSubtitle, { color: color }]}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function QuickActionCard({ title, icon, color, onPress }: { title: string; icon: string; color: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.quickActionText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function RevenueBar({ month, amount, maxAmount }: { month: string; amount: number; maxAmount: number }) {
  const { colors } = useTheme();
  const barWidth = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{month}</Text>
      <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.barValue, { color: colors.text }]}>₹{amount.toLocaleString()}</Text>
    </View>
  );
}

export default function AdminDashboard({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, st, f, p, a, al, se] = await Promise.all([
      getStudents(), getSeats(), getFees(), getPayments(), getAttendance(), getActivityLog(), getSettings()
    ]);
    setStudents(s); setSeats(st); setFees(f); setPayments(p); setAttendance(a); setActivityLog(al); setSettings(se);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate stats
  const activeStudents = students.filter(s => s.isActive).length;
  const occupiedSeats = seats.filter(s => !s.isLabel && (s.morningStudentId || s.eveningStudentId || s.fullDayStudentId)).length;
  const totalSeats = seats.filter(s => !s.isLabel).length;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCheckIns = attendance.filter(a => a.date === todayStr && a.checkIn).length;
  
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingDues = fees.filter(f => f.status === 'due' || f.status === 'overdue').reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);

  // Monthly revenue data (last 6 months)
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthKey = format(d, 'MMM');
    const monthPayments = payments.filter(p => {
      const pd = new Date(p.date);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    });
    return { month: monthKey, amount: monthPayments.reduce((sum, p) => sum + p.amount, 0) };
  });
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.amount), 1);

  const quickActions = [
    { title: t('addStudent'), icon: 'person-add', color: colors.primary, screen: 'AddStudent' },
    { title: t('recordPayment'), icon: 'card', color: colors.success, screen: 'FeeManagement' },
    { title: t('sendNotice'), icon: 'megaphone', color: colors.warning, screen: 'NoticeBoard' },
    { title: t('manageSeats'), icon: 'grid', color: '#8B5CF6', screen: 'SeatManagement' },
    { title: t('viewReports'), icon: 'bar-chart', color: '#EC4899', screen: 'Reports' },
    { title: t('settings'), icon: 'settings', color: colors.textSecondary, screen: 'AdminSettings' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerGreeting}>👋 {t('welcome')}</Text>
          <Text style={styles.headerName}>{user?.name || t('adminPanel')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerAvatar}>
          <Ionicons name="person-circle" size={42} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={() => (
          <View style={styles.content}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard title={t('totalStudents')} value={activeStudents} icon="people" color={colors.primary} />
              <StatCard title={t('occupiedSeats')} value={`${occupiedSeats}/${totalSeats}`} icon="business" color={colors.success} />
              <StatCard title={t('revenue')} value={`₹${totalRevenue.toLocaleString()}`} icon="wallet" color={colors.warning} />
              <StatCard title={t('todayCheckIns')} value={todayCheckIns} icon="log-in" color="#8B5CF6" />
            </View>

            {/* Pending Dues Alert */}
            {pendingDues > 0 && (
              <View style={[styles.alertBox, { backgroundColor: colors.error + '10', borderLeftColor: colors.error }]}>
                <Ionicons name="warning" size={20} color={colors.error} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: colors.error }]}>{t('pendingDues')}</Text>
                  <Text style={[styles.alertText, { color: colors.textSecondary }]}>₹{pendingDues.toLocaleString()} pending collection</Text>
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickActions')}</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, idx) => (
                <QuickActionCard key={idx} {...action} onPress={() => navigation.navigate(action.screen)} />
              ))}
            </View>

            {/* Monthly Revenue Chart */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('monthlyRevenue')}</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {monthlyRevenue.map((m, i) => (
                <RevenueBar key={i} {...m} maxAmount={maxRevenue} />
              ))}
            </View>

            {/* Recent Activity */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentActivity')}</Text>
            <View style={[styles.activityCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {activityLog.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noData')}</Text>
              ) : (
                activityLog.slice(0, 5).map((log, idx) => (
                  <View key={log.id || idx} style={[styles.activityItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityUser, { color: colors.text }]}>{log.userName}</Text>
                      <Text style={[styles.activityAction, { color: colors.textSecondary }]} numberOfLines={1}>{log.action}</Text>
                    </View>
                    <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                      {format(new Date(log.timestamp), 'HH:mm')}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 30 }} />
          </View>
        )}
        keyExtractor={() => 'dashboard'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerName: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  headerAvatar: {},
  content: { padding: 20, paddingTop: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: cardWidth, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statContent: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statTitle: { fontSize: 12, marginTop: 2 },
  statSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  alertBox: { flexDirection: 'row', padding: 16, borderRadius: 12, borderLeftWidth: 4, marginBottom: 20, alignItems: 'center' },
  alertContent: { marginLeft: 12, flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700' },
  alertText: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  quickAction: { width: (width - 56) / 3, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  chartCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 40, fontSize: 12, fontWeight: '600' },
  barBackground: { flex: 1, height: 20, borderRadius: 10, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 10, minWidth: 4 },
  barValue: { width: 70, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  activityCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  activityInfo: { flex: 1 },
  activityUser: { fontSize: 14, fontWeight: '600' },
  activityAction: { fontSize: 12, marginTop: 1 },
  activityTime: { fontSize: 11 },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});
