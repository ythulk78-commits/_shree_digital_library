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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { getComplaints, saveComplaints, addActivityLog, getStudents } from '../lib/storage';
import type { Complaint, ComplaintType, ComplaintStatus } from '../lib/types';

const complaintTypes: { key: ComplaintType; label: string; icon: string; color: string }[] = [
  { key: 'ac', label: t('acIssue'), icon: 'snow', color: '#3B82F6' },
  { key: 'noise', label: t('noiseIssue'), icon: 'volume-high', color: '#F59E0B' },
  { key: 'seating', label: t('seatingIssue'), icon: 'chair', color: '#8B5CF6' },
  { key: 'cleanliness', label: t('cleanlinessIssue'), icon: 'water', color: '#10B981' },
  { key: 'other', label: t('other'), icon: 'ellipsis-horizontal', color: '#6B7280' },
];

const statusConfig: Record<ComplaintStatus, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: '#F59E0B' },
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  resolved: { label: 'Resolved', color: '#10B981' },
};

export default function ComplaintsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ComplaintType>('other');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    const c = await getComplaints();
    setComplaints(c.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const submitComplaint = async () => {
    if (!description.trim()) return;
    const newComplaint: Complaint = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: user?.id || '',
      type: selectedType,
      description: description.trim(),
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newComplaint, ...complaints];
    await saveComplaints(updated);
    setComplaints(updated);
    setShowCreateModal(false);
    setDescription('');
    const descPreview = description.substring(0, 50);
    await addActivityLog({ userId: user?.id || '', userName: user?.name || 'Student', action: 'Filed complaint', details: descPreview });
  };

  const updateStatus = async (complaintId: string, newStatus: ComplaintStatus) => {
    const updated = complaints.map(c => c.id === complaintId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c);
    await saveComplaints(updated);
    setComplaints(updated);
  };

  const isAdmin = role === 'admin';
  const displayComplaints = isAdmin
    ? complaints
    : complaints.filter(c => c.studentId === user?.id);
  const filteredComplaints = filter === 'all' ? displayComplaints : displayComplaints.filter(c => c.status === filter);

  const getStudentName = (studentId: string) => {
    // Would need to load students - simplified for now
    return user?.id === studentId ? user?.name : `Student #${studentId.substr(0, 4)}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('complaints')}</Text>
        {role === 'student' && (
          <TouchableOpacity onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        {!isAdmin && role !== 'student' && <View style={{ width: 24 }} />}
      </View>

      {/* Filters for Admin */}
      {isAdmin && (
        <View style={[styles.filterBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {['all', 'submitted', 'in_progress', 'resolved'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.text }]}>{f.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filteredComplaints}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.complaintCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.complaintHeader}>
              <View style={[styles.typeIcon, { backgroundColor: complaintTypes.find(ct => ct.key === item.type)?.color + '15' }]}>
                <Ionicons name={complaintTypes.find(ct => ct.key === item.type)?.icon as any} size={18} color={complaintTypes.find(ct => ct.key === item.type)?.color} />
              </View>
              <View style={styles.complaintInfo}>
                <Text style={[styles.complaintType, { color: colors.text }]}>{complaintTypes.find(ct => ct.key === item.type)?.label}</Text>
                <Text style={[styles.complaintDate, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig[item.status].color + '15' }]}>
                <Text style={[styles.statusText, { color: statusConfig[item.status].color }]}>{statusConfig[item.status].label}</Text>
              </View>
            </View>
            
            <Text style={[styles.complaintDesc, { color: colors.textSecondary }]}>{item.description}</Text>
            
            {isAdmin && item.status !== 'resolved' && (
              <View style={styles.adminActions}>
                {item.status === 'submitted' && (
                  <TouchableOpacity style={[styles.statusBtn, { backgroundColor: colors.info }]} onPress={() => updateStatus(item.id, 'in_progress')}>
                    <Text style={styles.statusBtnText}>Start Work</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'in_progress' && (
                  <TouchableOpacity style={[styles.statusBtn, { backgroundColor: colors.success }]} onPress={() => updateStatus(item.id, 'resolved')}>
                    <Text style={styles.statusBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noComplaints')}</Text>
            {role === 'student' && (
              <TouchableOpacity style={[styles.fileBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.fileBtnText}>{t('fileComplaint')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Create Complaint Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('fileComplaint')}</Text>
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typesGrid}>
              {complaintTypes.map(ct => (
                <TouchableOpacity key={ct.key} style={[styles.typeOption, { backgroundColor: selectedType === ct.key ? ct.color + '15' : colors.background, borderColor: selectedType === ct.key ? ct.color : colors.border }]} onPress={() => setSelectedType(ct.key)}>
                  <Ionicons name={ct.icon as any} size={20} color={ct.color} />
                  <Text style={[styles.typeOptionLabel, { color: colors.text }]}>{ct.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
            <TextInput
              style={[styles.descInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe your issue..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowCreateModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={submitComplaint} disabled={!description.trim()}>
                <Text style={styles.submitBtnText}>{t('submit')}</Text>
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
  filterBar: { flexDirection: 'row', padding: 10, gap: 6, marginHorizontal: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  complaintCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  typeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  complaintInfo: { flex: 1 },
  complaintType: { fontSize: 15, fontWeight: '700' },
  complaintDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  complaintDesc: { fontSize: 14, lineHeight: 20, color: '#64748B' },
  adminActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  statusBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15, marginBottom: 16 },
  fileBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  fileBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6, width: '46%' },
  typeOptionLabel: { fontSize: 12, fontWeight: '500' },
  descInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 80, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
