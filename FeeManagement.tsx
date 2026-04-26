import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { getStudents, getFees, getPayments, saveFees, savePayments, getSettings, addActivityLog } from '../lib/storage';
import type { Student, FeeRecord, Payment, PaymentMethod, FeeStatus } from '../lib/types';
import { format, addMonths, isAfter, parseISO, differenceInDays } from 'date-fns';

export default function FeeManagement({ navigation }: any) {
  const { colors } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [filter, setFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    const [s, f, p, se] = await Promise.all([getStudents(), getFees(), getPayments(), getSettings()]);
    setStudents(s); setFees(f); setPayments(p); setSettings(se);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-update fee statuses
  useEffect(() => {
    if (!fees.length || !settings) return;
    const today = new Date();
    const updated = fees.map(fee => {
      const dueDate = parseISO(fee.dueDate);
      if (fee.status === 'paid') return fee;
      
      if (isAfter(today, dueDate)) {
        const daysOverdue = differenceInDays(today, dueDate);
        if (daysOverdue > settings.gracePeriod) {
          return { ...fee, status: 'overdue' as FeeStatus, penalty: Math.floor(fee.amount * 0.05 * Math.floor(daysOverdue / 30)) };
        }
        return { ...fee, status: 'due' as FeeStatus };
      }
      return fee;
    });
    // Save updated statuses silently
    saveFees(updated).then(() => setFees(updated));
  }, [fees.length, settings]);

  const generateFeeForStudent = async (student: Student) => {
    const now = new Date();
    const dueDate = addMonths(now, 1);
    const existingFee = fees.find(f => f.studentId === student.id && format(parseISO(f.dueDate), 'MMM-yyyy') === format(dueDate, 'MMM-yyyy'));
    
    if (existingFee) {
      setSelectedStudent(student);
      setShowPaymentModal(true);
      return;
    }
    
    const newFee: FeeRecord = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: student.id,
      amount: settings?.defaultFee || 1500,
      paidAmount: 0,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      status: 'due',
      month: format(now, 'MMMM'),
      year: now.getFullYear(),
      createdAt: now.toISOString(),
    };
    
    const updated = [...fees, newFee];
    await saveFees(updated);
    setFees(updated);
    setSelectedStudent(student);
    setShowPaymentModal(true);
    await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Generated fee', details: `for ${student.name} - ₹${newFee.amount}` });
  };

  const recordPayment = async () => {
    if (!selectedStudent || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    const studentFees = fees.filter(f => f.studentId === selectedStudent.id && f.status !== 'paid').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const targetFee = studentFees[0];
    
    if (!targetFee) return;
    
    const payment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      feeRecordId: targetFee.id,
      studentId: selectedStudent.id,
      amount,
      method: paymentMethod,
      date: format(new Date(), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    };
    
    const newPaidAmount = targetFee.paidAmount + amount;
    const updatedFees = fees.map(f => {
      if (f.id === targetFee.id) {
        return {
          ...f,
          paidAmount: newPaidAmount,
          paidDate: newPaidAmount >= f.amount ? format(new Date(), 'yyyy-MM-dd') : f.paidDate,
          status: newPaidAmount >= f.amount ? 'paid' : 'partial' as FeeStatus,
        };
      }
      return f;
    });
    
    await saveFees(updatedFees);
    await savePayments([...payments, payment]);
    setFees(updatedFees);
    setPayments([...payments, payment]);
    
    await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Recorded payment', details: `₹${amount} from ${selectedStudent.name}` });
    
    setShowPaymentModal(false);
    setPaymentAmount('');
    setSelectedStudent(null);
  };

  const filteredFees = filter === 'all' ? fees : fees.filter(f => f.status === filter);
  const feeWithStudents = filteredFees.map(f => ({
    ...f,
    studentName: students.find(s => s.id === f.studentId)?.name || 'Unknown',
    mobile: students.find(s => s.id === f.studentId)?.mobile || '',
  })).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + (f.amount - f.paidAmount - (f.penalty || 0)), 0);
  const overdueCount = fees.filter(f => f.status === 'overdue').length;

  const getWhatsAppLink = (student: Student, type: 'fee_reminder' | 'welcome') => {
    const messages = {
      fee_reminder: `Dear ${student.name},\n\nThis is a reminder that your library fee of ₹${fees.find(f => f.studentId === student.id && f.status !== 'paid')?.amount || settings?.defaultFee} is pending.\n\nPlease clear your dues at the earliest to avoid late charges.\n\nThank you!\n- ${settings?.name || 'My Library'}`,
      welcome: `Dear ${student.name},\n\nWelcome to ${settings?.name || 'My Library'}! 🎉\n\nWe're excited to have you with us. Please check the app for your seat details and other information.\n\nHappy Learning! 📚`,
    };
    const msg = encodeURIComponent(messages[type]);
    return `https://wa.me/91${student.mobile}?text=${msg}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('fees')} & Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>₹{totalRevenue.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Collected</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>₹{totalPending.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{overdueCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Overdue</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {['all', 'due', 'overdue', 'paid'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.text }]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fee List */}
      <FlatList
        data={feeWithStudents}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.feeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.feeHeader}>
              <View style={styles.feeStudentInfo}>
                <Ionicons name="person-circle" size={32} color={colors.textSecondary} />
                <View>
                  <Text style={[styles.feeStudentName, { color: colors.text }]}>{item.studentName}</Text>
                  <Text style={[styles.feeMonth, { color: colors.textSecondary }]}>{item.month} {item.year}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? colors.success + '15' : item.status === 'overdue' ? colors.error + '15' : colors.warning + '15' }]}>
                <Text style={[styles.statusText, { color: item.status === 'paid' ? colors.success : item.status === 'overdue' ? colors.error : colors.warning }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.feeDetails}>
              <View style={styles.feeDetailItem}>
                <Text style={[styles.feeDetailLabel, { color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.feeDetailValue, { color: colors.text }]}>₹{item.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.feeDetailItem}>
                <Text style={[styles.feeDetailLabel, { color: colors.textSecondary }]}>Paid</Text>
                <Text style={[styles.feeDetailValue, { color: colors.success }]}>₹{item.paidAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.feeDetailItem}>
                <Text style={[styles.feeDetailLabel, { color: colors.textSecondary }]}>Due</Text>
                <Text style={[styles.feeDetailValue, { color: item.status === 'overdue' ? colors.error : colors.warning }]}>₹{(item.amount - item.paidAmount).toLocaleString()}</Text>
              </View>
              <View style={styles.feeDetailItem}>
                <Text style={[styles.feeDetailLabel, { color: colors.textSecondary }]}>Due Date</Text>
                <Text style={[styles.feeDetailValue, { color: colors.text }]}>{format(new Date(item.dueDate), 'dd MMM')}</Text>
              </View>
            </View>
            
            {item.penalty && item.penalty > 0 && (
              <View style={[styles.penaltyBar, { backgroundColor: colors.error + '10' }]}>
                <Ionicons name="warning" size={14} color={colors.error} />
                <Text style={[styles.penaltyText, { color: colors.error }]}>Late Penalty: ₹{item.penalty}</Text>
              </View>
            )}
            
            <View style={styles.feeActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => generateFeeForStudent(students.find(s => s.id === item.studentId)!)}>
                <Ionicons name="card" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Record Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={() => { /* WhatsApp link would open here */ }}>
                <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noData')}</Text>
          </View>
        )}
      />

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Record Payment</Text>
            {selectedStudent && (
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>For: {selectedStudent.name}</Text>
            )}
            
            <TextInput
              style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter amount"
              placeholderTextColor={colors.textSecondary}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
            />
            
            <Text style={[styles.methodLabel, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['cash', 'upi', 'bank_transfer'] as PaymentMethod[]).map(method => (
                <TouchableOpacity key={method} style={[styles.methodChip, { backgroundColor: paymentMethod === method ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => setPaymentMethod(method)}>
                  <Text style={[styles.methodText, { color: paymentMethod === method ? '#FFF' : colors.text }]}>{method.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setShowPaymentModal(false); setPaymentAmount(''); }}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.success }]} onPress={recordPayment} disabled={!paymentAmount}>
                <Text style={styles.confirmBtnText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 10 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  filterBar: { flexDirection: 'row', padding: 10, gap: 8, marginHorizontal: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  feeCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  feeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  feeStudentInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feeStudentName: { fontSize: 15, fontWeight: '700' },
  feeMonth: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  feeDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  feeDetailItem: { width: '46%', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 },
  feeDetailLabel: { fontSize: 10, color: '#64748B', marginBottom: 2 },
  feeDetailValue: { fontSize: 13, fontWeight: '600' },
  penaltyBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginBottom: 10 },
  penaltyText: { fontSize: 12, fontWeight: '600' },
  feeActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 5 },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  amountInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  methodLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  methodChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  methodText: { fontSize: 12, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: 1 },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
