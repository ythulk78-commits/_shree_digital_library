import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { getStudents, getSeats, saveStudents, saveSeats, addActivityLog } from '../lib/storage';
import type { Student, BatchType } from '../lib/types';

export default function AddStudent({ navigation }: any) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [batch, setBatch] = useState<BatchType>('morning');
  const [selectedSeatId, setSelectedSeatId] = useState<string>('');
  const [seats, setSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    getSeats().then(setSeats);
  }, []);

  const handleAdd = async () => {
    if (!name || !mobile || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (mobile.length !== 10) {
      Alert.alert('Error', 'Please enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const students = await getStudents();
      if (students.some(s => s.mobile === mobile)) {
        Alert.alert('Error', 'Mobile number already registered');
        setLoading(false);
        return;
      }

      const newStudent: Student = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        mobile,
        password,
        seatId: selectedSeatId || undefined,
        batch,
        joinedDate: new Date().toISOString(),
        totalStudyHours: 0,
        acceptedRules: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      students.push(newStudent);
      await saveStudents(students);

      // Assign seat if selected
      if (selectedSeatId) {
        const allSeats = await getSeats();
        const updatedSeats = allSeats.map(s => {
          if (s.id === selectedSeatId) {
            const updated = { ...s };
            if (batch === 'morning') updated.morningStudentId = newStudent.id;
            else if (batch === 'evening') updated.eveningStudentId = newStudent.id;
            else updated.fullDayStudentId = newStudent.id;
            updated.status = batch === 'full_day' ? 'reserved' : 'partial';
            return updated;
          }
          return s;
        });
        await saveSeats(updatedSeats);
      }

      await addActivityLog({ userId: 'admin', userName: 'Admin', action: 'Added student', details: `${name} (${mobile})` });
      
      Alert.alert(t('success'), `${name} has been added successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add student');
    }
    setLoading(false);
  };

  const availableSeats = seats.filter(s => !s.isLabel && s.status === 'available');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('addStudent')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📝 Student Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mobile Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                placeholder="9876543210"
                placeholderTextColor={colors.textSecondary}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Set password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Batch *</Text>
              <View style={styles.batchRow}>
                {[{ key: 'morning' as BatchType, label: '🌅 Morning', time: '8AM-12PM' }, { key: 'evening' as BatchType, label: '🌆 Evening', time: '2PM-8PM' }, { key: 'full_day' as BatchType, label: '☀️ Full Day', time: '8AM-8PM' }].map(b => (
                  <TouchableOpacity
                    key={b.key}
                    style={[styles.batchOption, { backgroundColor: batch === b.key ? colors.primary + '15' : colors.cardBg, borderColor: batch === b.key ? colors.primary : colors.border }]}
                    onPress={() => setBatch(b.key)}
                  >
                    <Text style={[styles.batchOptionLabel, { color: colors.text }]}>{b.label}</Text>
                    <Text style={[styles.batchOptionTime, { color: colors.textSecondary }]}>{b.time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Seat Selection */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💺 Select Seat (Optional)</Text>
            {availableSeats.length > 0 ? (
              <View style={styles.seatGrid}>
                {availableSeats.slice(0, 20).map(seat => (
                  <TouchableOpacity
                    key={seat.id}
                    style={[styles.seatOption, {
                      backgroundColor: selectedSeatId === seat.id ? colors.primary : colors.cardBg,
                      borderColor: selectedSeatId === seat.id ? colors.primary : colors.border,
                    }]}
                    onPress={() => setSelectedSeatId(selectedSeatId === seat.id ? '' : seat.id)}
                  >
                    <Text style={[styles.seatOptionLabel, { color: selectedSeatId === seat.id ? '#FFF' : colors.text }]}>{seat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.noSeats, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="alert-circle" size={24} color={colors.warning} />
                <Text style={[styles.noSeatsText, { color: colors.textSecondary }]}>No seats available. Manage seats first.</Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: loading ? colors.textSecondary : colors.primary }]}
            onPress={handleAdd}
            disabled={loading}
          >
            <Ionicons name="person-add" size={20} color="#FFF" />
            <Text style={styles.submitButtonText}>{loading ? t('loading') : t('addStudent')}</Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  content: { padding: 20 },
  formSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15 },
  batchRow: { flexDirection: 'row', gap: 10 },
  batchOption: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5 },
  batchOptionLabel: { fontSize: 13, fontWeight: '700' },
  batchOptionTime: { fontSize: 10, marginTop: 2 },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatOption: { width: 62, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  seatOptionLabel: { fontSize: 12, fontWeight: '700' },
  noSeats: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1 },
  noSeatsText: { fontSize: 13, flex: 1 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8, shadowColor: colors => colors?.primary || '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
