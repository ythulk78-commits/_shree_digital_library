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
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { getSeats, getStudents, saveSeats, addActivityLog } from '../lib/storage';
import type { Seat, Student, SeatStatus, BatchType } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

const { width } = Dimensions.get('window');

const statusColors: Record<SeatStatus, string> = {
  available: '#22C55E',
  reserved: '#EF4444',
  partial: '#F97316',
  due: '#EAB308',
  maintenance: '#9CA3AF',
};

const statusLabels: Record<SeatStatus, string> = {
  available: '🟢 Available',
  reserved: '🔴 Reserved',
  partial: '🟠 Partial',
  due: '🟡 Payment Due',
  maintenance: '⚪ Maintenance',
};

export default function SeatManagement({ navigation }: any) {
  const { colors } = useTheme();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showSeatDetail, setShowSeatDetail] = useState<Seat | null>(null);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);
  const [filter, setFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    const [s, st] = await Promise.all([getSeats(), getStudents()]);
    setSeats(s); setStudents(st);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generateGrid = async () => {
    const newSeats: Seat[] = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        newSeats.push({
          id: uuidv4(),
          label: `S${r}${String(c).padStart(2, '0')}`,
          row: r,
          col: c,
          status: 'available',
          isLabel: false,
        });
      }
    }
    await saveSeats(newSeats);
    setSeats(newSeats);
    setShowGenerator(false);
    await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Regenerated seat grid', details: `${rows}x${cols} grid` });
  };

  const updateSeatStatus = async (seatId: string, newStatus: SeatStatus) => {
    const updated = seats.map(s => s.id === seatId ? { ...s, status: newStatus } : s);
    await saveSeats(updated);
    setSeats(updated);
  };

  const assignStudent = async (seatId: string, studentId: string, batch: BatchType) => {
    const updated = seats.map(s => {
      if (s.id === seatId) {
        const newSeat = { ...s };
        if (batch === 'morning') newSeat.morningStudentId = studentId;
        else if (batch === 'evening') newSeat.eveningStudentId = studentId;
        else newSeat.fullDayStudentId = studentId;
        newSeat.status = batch === 'full_day' ? 'reserved' : 'partial';
        return newSeat;
      }
      return s;
    });
    await saveSeats(updated);
    setSeats(updated);
    const student = students.find(s => s.id === studentId);
    await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Assigned seat', details: `${student?.name} → ${seats.find(s => s.id === seatId)?.label} (${batch})` });
  };

  const filteredSeats = filter === 'all' ? seats : seats.filter(s => s.status === filter);
  const actualSeats = filteredSeats.filter(s => !s.isLabel);
  const labels = filteredSeats.filter(s => s.isLabel);

  const getStatusForSeat = (seat: Seat): SeatStatus => {
    if (seat.fullDayStudentId) return 'reserved';
    if (seat.morningStudentId && seat.eveningStudentId) return 'reserved';
    if (seat.morningStudentId || seat.eveningStudentId) return 'partial';
    return seat.status;
  };

  const getStudentForSeat = (seat: Seat, batch: BatchType): Student | undefined => {
    if (batch === 'morning') return students.find(s => s.id === seat.morningStudentId);
    if (batch === 'evening') return students.find(s => s.id === seat.eveningStudentId);
    return students.find(s => s.id === seat.fullDayStudentId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('seatMap')}</Text>
        <TouchableOpacity onPress={() => setShowGenerator(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {['all', 'available', 'reserved', 'partial'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.background, borderColor: colors.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.text }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {(Object.entries(statusLabels) as [SeatStatus, string][]).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColors[key] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label.split(' ')[1]}</Text>
          </View>
        ))}
      </View>

      {/* Seats Grid */}
      <FlatList
        data={[1]}
        contentContainerStyle={styles.gridContent}
        renderItem={() => (
          <View style={styles.seatGrid}>
            {labels.map(label => (
              <View key={label.id} style={[styles.labelTile, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
                <Text style={[styles.labelText, { color: colors.secondary }]}>{label.label}</Text>
              </View>
            ))}
            {actualSeats.map(seat => {
              const effectiveStatus = getStatusForSeat(seat);
              return (
                <TouchableOpacity
                  key={seat.id}
                  style={[
                    styles.seatTile,
                    { backgroundColor: statusColors[effectiveStatus] + '20', borderColor: statusColors[effectiveStatus] }
                  ]}
                  onPress={() => setShowSeatDetail(seat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seatLabel, { color: colors.text }]}>{seat.label}</Text>
                  {(seat.morningStudentId || seat.eveningStudentId || seat.fullDayStudentId) ? (
                    <Ionicons name="person" size={12} color={statusColors[effectiveStatus]} />
                  ) : (
                    <Ionicons name="ellipse" size={8} color={statusColors.available} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        keyExtractor={() => 'seats'}
      />

      {/* Generate Grid Modal */}
      <Modal visible={showGenerator} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('gridTool')}</Text>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('rows')}</Text>
              <TextInput
                style={[styles.numInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={String(rows)}
                onChangeText={(v) => setRows(parseInt(v) || 1)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('columns')}</Text>
              <TextInput
                style={[styles.numInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={String(cols)}
                onChangeText={(v) => setCols(parseInt(v) || 1)}
                keyboardType="number-pad"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowGenerator(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={generateGrid}>
                <Text style={styles.generateBtnText}>{t('generate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Seat Detail Modal */}
      <Modal visible={!!showSeatDetail} transparent animationType="slide">
        {showSeatDetail && (
          <SeatDetailModal
            seat={showSeatDetail}
            students={students}
            colors={colors}
            onClose={() => setShowSeatDetail(null)}
            onUpdateStatus={updateSeatStatus}
            onAssignStudent={assignStudent}
            getStudentForSeat={getStudentForSeat}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function SeatDetailModal({ seat, students, colors, onClose, onUpdateStatus, onAssignStudent, getStudentForSeat }: {
  seat: Seat; students: Student[]; colors: any; onClose: () => void;
  onUpdateStatus: (id: string, status: SeatStatus) => void;
  onAssignStudent: (id: string, studentId: string, batch: BatchType) => void;
  getStudentForSeat: (seat: Seat, batch: BatchType) => Student | undefined;
}) {
  const [activeTab, setActiveTab] = useState<BatchType>('morning');
  
  const morningStudent = getStudentForSeat(seat, 'morning');
  const eveningStudent = getStudentForSeat(seat, 'evening');
  const fullDayStudent = getStudentForSeat(seat, 'full_day');
  
  const availableStudents = students.filter(s => !s.seatId && s.isActive);

  return (
    <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.detailModal, { backgroundColor: colors.cardBg }]}>
        <View style={styles.detailHeader}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>{seat.label}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>Row {seat.row}, Col {seat.col}</Text>
        
        {/* Status Change */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Change Status</Text>
        <View style={styles.statusRow}>
          {(Object.keys(statusLabels) as SeatStatus[]).map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.statusChip, { backgroundColor: statusColors[status] + '20', borderColor: seat.status === status ? statusColors[status] : colors.border }]}
              onPress={() => { onUpdateStatus(seat.id, status); onClose(); }}
            >
              <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
              <Text style={[styles.statusText, { color: colors.text }]}>{statusLabels(status).split(' ')[1]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Assignment Tabs */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Assign Student</Text>
        <View style={styles.tabRow}>
          {(['morning', 'evening', 'full_day'] as BatchType[]).map(batch => (
            <TouchableOpacity
              key={batch}
              style={[styles.tab, { backgroundColor: activeTab === batch ? colors.primary : colors.background, borderColor: colors.border }]}
              onPress={() => setActiveTab(batch)}
            >
              <Text style={[styles.tabText, { color: activeTab === batch ? '#FFF' : colors.text }]}>{batch.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Current Assignment */}
        {(activeTab === 'morning' ? morningStudent : activeTab === 'evening' ? eveningStudent : fullDayStudent) ? (
          <View style={[styles.currentAssignment, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Ionicons name="person" size={18} color={colors.primary} />
            <Text style={[styles.assignmentName, { color: colors.text }]}>
              {(activeTab === 'morning' ? morningStudent : activeTab === 'evening' ? eveningStudent : fullDayStudent)?.name}
            </Text>
          </View>
        ) : null}
        
        {/* Student List for Assignment */}
        <View style={styles.studentList}>
          {availableStudents.slice(0, 5).map(student => (
            <TouchableOpacity
              key={student.id}
              style={[styles.studentItem, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => { onAssignStudent(seat.id, student.id, activeTab); onClose(); }}
            >
              <Ionicons name="person-circle" size={24} color={colors.textSecondary} />
              <View style={styles.studentInfo}>
                <Text style={[styles.studentName, { color: colors.text }]}>{student.name}</Text>
                <Text style={[styles.studentMobile, { color: colors.textSecondary }]}>{student.mobile}</Text>
              </View>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {availableStudents.length === 0 && (
            <Text style={[styles.noStudents, { color: colors.textSecondary }]}>No available students</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  filterBar: { flexDirection: 'row', padding: 12, gap: 8, margin: 16, borderRadius: 12, borderWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  gridContent: { padding: 16, paddingBottom: 40 },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  seatTile: { width: (width - 64) / 7, height: 56, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  seatLabel: { fontSize: 11, fontWeight: '700' },
  labelTile: { width: width - 64, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  labelText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  inputLabel: { fontSize: 16, fontWeight: '600' },
  numInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  generateBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  generateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  detailModal: { borderRadius: 20, padding: 24, width: '90%', maxHeight: '80%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailTitle: { fontSize: 22, fontWeight: 'bold' },
  detailSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tabText: { fontSize: 13, fontWeight: '600' },
  currentAssignment: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 8 },
  assignmentName: { fontSize: 14, fontWeight: '600' },
  studentList: { maxHeight: 200 },
  studentItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 10 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600' },
  studentMobile: { fontSize: 12 },
  noStudents: { textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
});
