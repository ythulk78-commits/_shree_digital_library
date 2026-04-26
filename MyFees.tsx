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
import { getFees, getPayments, getSettings } from '../lib/storage';
import type { FeeRecord, Payment, Student } from '../lib/types';
import { format } from 'date-fns';

export default function MyFees({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth() as { user: Student };
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [f, p, s] = await Promise.all([getFees(), getPayments(), getSettings()]);
    setFees(f.filter(fee => fee.studentId === user?.id).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
    setPayments(p.filter(pay => pay.studentId === user?.id));
    setSettings(s);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const myPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('feeHistory')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={[styles.summaryValue, { color: colors.success }]}>₹{totalPaid.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Paid</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: totalDue > 0 ? colors.error + '10' : colors.success + '10', borderColor: totalDue > 0 ? colors.error : colors.success }]}>
          <Ionicons name="alert-circle" size={24} color={totalDue > 0 ? colors.error : colors.success} />
          <Text style={[styles.summaryValue, { color: totalDue > 0 ? colors.error : colors.success }]}>₹{totalDue.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance Due</Text>
        </View>
      </View>

      {/* Fee Records */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Fee Statements</Text>
      <FlatList
        data={fees}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.feeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.feeHeader}>
              <Text style={[styles.feeMonth, { color: colors.text }]}>{item.month} {item.year}</Text>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: item.status === 'paid' ? colors.success + '15' : item.status === 'overdue' ? colors.error + '15' : colors.warning + '15',
                }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: item.status === 'paid' ? colors.success : item.status === 'overdue' ? colors.error : colors.warning }
                ]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.feeRow}>
              <View style={styles.feeItem}>
                <Text style={[styles.feeItemLabel, { color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.feeItemValue, { color: colors.text }]}>₹{item.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={[styles.feeItemLabel, { color: colors.textSecondary }]}>Paid</Text>
                <Text style={[styles.feeItemValue, { color: colors.success }]}>₹{item.paidAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={[styles.feeItemLabel, { color: colors.textSecondary }]}>Due</Text>
                <Text style={[styles.feeItemValue, { color: item.amount - item.paidAmount > 0 ? colors.warning : colors.success }]}>₹{(item.amount - item.paidAmount).toLocaleString()}</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={[styles.feeItemLabel, { color: colors.textSecondary }]}>Due Date</Text>
                <Text style={[styles.feeItemValue, { color: colors.text }]}>{format(new Date(item.dueDate), 'dd MMM')}</Text>
              </View>
            </View>
            
            {item.penalty && item.penalty > 0 && (
              <View style={[styles.penaltyBar, { backgroundColor: colors.error + '10' }]}>
                <Ionicons name="warning" size={14} color={colors.error} />
                <Text style={[styles.penaltyText, { color: colors.error }]}>Late Penalty: ₹{item.penalty}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noReceipt')}</Text>
          </View>
        )}
        ListFooterComponent={() => (
          fees.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }, { marginTop: 16 }]}>Payment History</Text>
              {myPayments.map(payment => (
                <View key={payment.id} style={[styles.paymentCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={[styles.paymentIcon, { backgroundColor: colors.success + '15' }]}>
                    <Ionicons name="card" size={20} color={colors.success} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, { color: colors.text }]}>₹{payment.amount.toLocaleString()}</Text>
                    <Text style={[styles.paymentMeta, { color: colors.textSecondary }]}>{payment.method.replace('_', ' ')} • {format(new Date(payment.date), 'dd MMM yyyy')}</Text>
                  </View>
                  <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
                </View>
              ))}
              {myPayments.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payment records found</Text>
                </View>
              )}
              <View style={{ height: 30 }} />
            </>
          ) : null
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  summaryLabel: { fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  listContent: { padding: 16, paddingBottom: 40 },
  feeCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  feeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  feeMonth: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  feeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feeItem: { width: '46%', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10 },
  feeItemLabel: { fontSize: 10, color: '#64748B', marginBottom: 2 },
  feeItemValue: { fontSize: 13, fontWeight: '600' },
  penaltyBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 10 },
  penaltyText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 8, fontSize: 14 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  paymentIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { flex: 1, marginLeft: 12 },
  paymentAmount: { fontSize: 16, fontWeight: 'bold' },
  paymentMeta: { fontSize: 12, marginTop: 2 },
});
