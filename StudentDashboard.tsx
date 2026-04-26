import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { getFees, getAttendance, getNotices, getSeats, saveAttendance, addActivityLog } from '../lib/storage';
import type { FeeRecord, AttendanceRecord, Notice, Student } from '../lib/types';
import { format, differenceInMinutes } from 'date-fns';

const { width } = Dimensions.get('window');

export default function StudentDashboard({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth() as { user: Student };
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState<AttendanceRecord | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);

  const loadData = useCallback(async () => {
    const [f, a, n, s] = await Promise.all([getFees(), getAttendance(), getNotices(), getSeats()]);
    setFees(f); setAttendance(a); setNotices(n); setSeats(s);
    
    // Check if already checked in today
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecord = a.find(att => att.studentId === user?.id && att.date === today);
    if (todayRecord && todayRecord.checkIn && !todayRecord.checkOut) {
      setIsCheckedIn(true);
      setCurrentSession(todayRecord);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckInOut = async () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm:ss');

    if (isCheckedIn && currentSession) {
      // Check out
      const updatedAtt = attendance.map(a => {
        if (a.id === currentSession.id) {
          const totalMinutes = differenceInMinutes(now, new Date(`${a.date}T${a.checkIn}`));
          return { ...a, checkOut: timeStr, totalMinutes };
        }
        return a;
      });
      await saveAttendance(updatedAtt);
      setIsCheckedIn(false);
      setCurrentSession(null);
      await addActivityLog({ userId: user!.id, userName: user!.name, action: 'Checked Out', details: `at ${timeStr}` });
    } else {
      // Check in
      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: user!.id,
        date: today,
        checkIn: timeStr,
        totalMinutes: 0,
        createdAt: now.toISOString(),
      };
      const updatedAtt = [...attendance, newRecord];
      await saveAttendance(updatedAtt);
      setIsCheckedIn(true);
      setCurrentSession(newRecord);
      await addActivityLog({ userId: user!.id, userName: user!.name, action: 'Checked In', details: `at ${timeStr}` });
    }
    await loadData();
  };

  // Fee status
  const myFees = fees.filter(f => f.studentId === user?.id);
  const latestFee = myFees.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
  const feeStatus = latestFee?.status || 'due';
  const feeDue = latestFee ? latestFee.amount - latestFee.paidAmount : 0;

  // Study hours this week
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekAttendance = attendance.filter(
    a => a.studentId === user?.id && a.date >= weekStart && a.totalMinutes > 0
  );
  const weeklyHours = Math.round(weekAttendance.reduce((sum, a) => sum + a.totalMinutes, 0) / 60);

  // Unread notices
  const unreadCount = notices.filter(n => n.isActive && !n.readBy.includes(user?.id || '')).length;

  // My seat info
  const mySeat = seats.find(s => 
    s.morningStudentId === user?.id || 
    s.eveningStudentId === user?.id || 
    s.fullDayStudentId === user?.id
  );

  const menuItems = [
    { title: t('fees'), icon: 'card', color: colors.success, screen: 'MyFees', badge: feeStatus !== 'paid' ? '!' : undefined },
    { title: t('attendance'), icon: 'calendar', color: colors.info, screen: 'MyAttendance' },
    { title: t('notices'), icon: 'notifications', color: colors.warning, screen: 'NoticeBoard', badge: unreadCount > 0 ? String(unreadCount) : undefined },
    { title: t('pomodoro'), icon: 'timer', color: '#EC4899', onPress: () => setShowPomodoro(true) },
    { title: t('leaderboard'), icon: 'trophy', color: '#F59E0B', screen: 'Leaderboard' },
    { title: t('complaints'), icon: 'chatbubble', color: '#8B5CF6', screen: 'Complaints' },
    { title: t('rules'), icon: 'document-text', color: '#6366F1', screen: 'Rules' },
    { title: t('settings'), icon: 'settings', color: colors.textSecondary, screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerGreeting}>👋 {t('welcome')}</Text>
          <Text style={styles.headerName}>{user?.name || t('student')}</Text>
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
            {/* Check In/Out Card */}
            <View style={[styles.checkinCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.checkinInfo}>
                <Text style={[styles.checkinStatus, { color: colors.text }]}>
                  {isCheckedIn ? '✅ ' + t('checkIn') + ' Active' : '⏰ Ready to ' + t('checkIn')}
                </Text>
                <Text style={[styles.checkinDetail, { color: colors.textSecondary }]}>
                  {isCheckedIn ? `Since ${currentSession?.checkIn}` : t('tapToCheckIn')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.checkinButton, { backgroundColor: isCheckedIn ? colors.error : colors.success }]}
                onPress={handleCheckInOut}
                activeOpacity={0.8}
              >
                <Ionicons name={isCheckedIn ? 'log-out' : 'log-in'} size={20} color="#FFF" />
                <Text style={styles.checkinButtonText}>{isCheckedIn ? t('checkOut') : t('checkIn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Info Cards Row */}
            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Ionicons name="business" size={20} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('seats')}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{mySeat?.label || t('noData')}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Ionicons name="time" size={20} color={colors.warning} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('thisWeek')}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{weeklyHours}h</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Ionicons name="wallet" size={20} color={feeStatus === 'overdue' ? colors.error : colors.success} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('fees')}</Text>
                <Text style={[styles.infoValue, { color: feeStatus === 'overdue' ? colors.error : colors.text }]}>
                  {feeStatus === 'paid' ? '✓' : `₹${feeDue}`}
                </Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuGrid}>
              {menuItems.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => item.onPress ? item.onPress() : navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>{item.title}</Text>
                  {item.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 30 }} />
          </View>
        )}
        keyExtractor={() => 'sdash'}
      />

      {/* Pomodoro Modal */}
      <Modal visible={showPomodoro} animationType="slide" transparent onRequestClose={() => setShowPomodoro(false)}>
        <PomodoroModal colors={colors} onClose={() => setShowPomodoro(false)} studentId={user?.id} />
      </Modal>
    </SafeAreaView>
  );
}

function PomodoroModal({ colors, onClose, studentId }: { colors: any; onClose: () => void; studentId?: string }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      if (!isBreak) {
        setSessions(s => s + 1);
        setIsBreak(true);
        setSeconds(5 * 60);
      } else {
        setIsBreak(false);
        setSeconds(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, isBreak]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.pomodoroContainer, { backgroundColor: colors.cardBg }]}>
        <View style={styles.pomodoroHeader}>
          <Text style={[styles.pomodoroTitle, { color: colors.text }]}>{t('pomodoro')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.pomodoroMode, { color: isBreak ? colors.success : colors.primary }]}>
          {isBreak ? t('breakTime') : t('focusSession')}
        </Text>
        
        <Text style={[styles.pomodoroTimer, { color: colors.text }]}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </Text>
        
        <Text style={[styles.pomodoroSessions, { color: colors.textSecondary }]}>
          🍅 {sessions} sessions completed
        </Text>
        
        <View style={styles.pomodoroButtons}>
          <TouchableOpacity
            style={[styles.pomoBtn, { backgroundColor: isActive ? colors.warning : colors.primary }]}
            onPress={() => setIsActive(!isActive)}
          >
            <Ionicons name={isActive ? 'pause' : 'play'} size={20} color="#FFF" />
            <Text style={styles.pomoBtnText}>{isActive ? t('pause') : t('start')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pomoBtn, { backgroundColor: colors.textSecondary }]}
            onPress={() => { setIsActive(false); setSeconds(isBreak ? 5 * 60 : 25 * 60); }}
          >
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.pomoBtnText}>{t('reset')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerName: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  headerAvatar: {},
  content: { padding: 20, paddingTop: 16 },
  checkinCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  checkinInfo: {},
  checkinStatus: { fontSize: 16, fontWeight: '700' },
  checkinDetail: { fontSize: 13, marginTop: 4 },
  checkinButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  checkinButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  infoLabel: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuItem: { width: (width - 56) / 4, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  menuText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  pomodoroContainer: { borderRadius: 24, padding: 30, width: '100%', maxWidth: 340, alignItems: 'center' },
  pomodoroHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  pomodoroTitle: { fontSize: 22, fontWeight: 'bold' },
  pomodoroMode: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  pomodoroTimer: { fontSize: 64, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 12 },
  pomodoroSessions: { fontSize: 14, marginBottom: 24 },
  pomodoroButtons: { flexDirection: 'row', gap: 12 },
  pomoBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, gap: 8 },
  pomoBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  tapToCheckIn: { fontSize: 12, fontStyle: 'italic' },
});
