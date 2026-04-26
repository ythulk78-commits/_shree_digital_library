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
import { getNotices, saveNotices, addActivityLog } from '../lib/storage';
import type { Notice, NoticeType } from '../lib/types';

const noticeIcons: Record<NoticeType, string> = {
  urgent: 'warning',
  holiday: 'sunny',
  general: 'information-circle',
};

const noticeColors: Record<NoticeType, string> = {
  urgent: '#EF4444',
  holiday: '#F59E0B',
  general: '#3B82F6',
};

export default function NoticeBoard({ navigation }: any) {
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<NoticeType>('general');

  const loadData = useCallback(async () => {
    const n = await getNotices();
    setNotices(n.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const markAsRead = async (noticeId: string) => {
    if (!user) return;
    const updated = notices.map(n => {
      if (n.id === noticeId && !n.readBy.includes(user.id as string)) {
        return { ...n, readBy: [...n.readBy, user.id as string] };
      }
      return n;
    });
    await saveNotices(updated);
    setNotices(updated);
  };

  const createNotice = async () => {
    if (!newTitle || !newMessage) return;
    const newNotice: Notice = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      message: newMessage,
      type: newType,
      isActive: true,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    const updated = [newNotice, ...notices];
    await saveNotices(updated);
    setNotices(updated);
    setShowCreateModal(false);
    setNewTitle('');
    setNewMessage('');
    await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Posted notice', details: newTitle });
  };

  const deleteNotice = async (noticeId: string) => {
    const updated = notices.filter(n => n.id !== noticeId);
    await saveNotices(updated);
    setNotices(updated);
  };

  const isAdmin = role === 'admin';
  const filteredNotices = filter === 'all' ? notices : notices.filter(n => n.type === filter);
  const unreadCount = notices.filter(n => n.isActive && !n.readBy.includes(user?.id || '')).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('noticeBoard')}</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={{ width: 24 }} />}
      </View>

      {/* Filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {['all', 'urgent', 'holiday', 'general'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => setFilter(f)}>
            {f !== 'all' && <View style={[styles.filterDot, { backgroundColor: noticeColors[f as NoticeType] }]}/>}
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.text }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredNotices}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noticeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => markAsRead(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.noticeHeader}>
              <View style={[styles.noticeIconWrap, { backgroundColor: noticeColors[item.type] + '15' }]}>
                <Ionicons name={noticeIcons[item.type] as any} size={20} color={noticeColors[item.type]} />
              </View>
              <View style={styles.noticeTitleWrap}>
                <View style={styles.noticeTitleRow}>
                  <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  {!item.readBy.includes(user?.id || '') && (
                    <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.newBadgeText}>{t('newBadge')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.noticeDate, { color: colors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString()} • {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={[styles.noticeMessage, { color: colors.textSecondary }]} numberOfLines={item.readBy.includes(user?.id || '') ? 2 : 3}>{item.message}</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNotice(item.id)}>
                <Ionicons name="trash" size={16} color={colors.error} />
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noData')}</Text>
          </View>
        )}
      />

      {/* Create Notice Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Notice</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Notice title"
              placeholderTextColor={colors.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Message *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Notice message..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={4}
            />
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              {(Object.keys(noticeIcons) as NoticeType[]).map(type => (
                <TouchableOpacity key={type} style={[styles.typeChip, { backgroundColor: newType === type ? noticeColors[type] : colors.background, borderColor: newType === type ? noticeColors[type] : colors.border }]} onPress={() => setNewType(type)}>
                  <Ionicons name={noticeIcons[type] as any} size={14} color={newType === type ? '#FFF' : noticeColors[type]} />
                  <Text style={[styles.typeChipText, { color: newType === type ? '#FFF' : colors.text }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowCreateModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={createNotice} disabled={!newTitle || !newMessage}>
                <Text style={styles.createBtnText}>Post Notice</Text>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  badge: { backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  filterBar: { flexDirection: 'row', padding: 10, gap: 6, marginHorizontal: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, gap: 4 },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 11, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  noticeCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  noticeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  noticeIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  noticeTitleWrap: { flex: 1 },
  noticeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  noticeTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  newBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  noticeDate: { fontSize: 12 },
  noticeMessage: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' },
  deleteBtnText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 4 },
  typeChipText: { fontSize: 12, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  createBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  createBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
