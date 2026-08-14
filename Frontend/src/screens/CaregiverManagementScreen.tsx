import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { CaregiverResponse, getUserCaregivers, inviteCaregiver, revokeCaregiver, updateCaregiverPermissions } from '../services/caregiverApi';

export default function CaregiverManagementScreen() {
  const [caregivers, setCaregivers] = useState<CaregiverResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const { navigateTo } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    try {
      const data = await getUserCaregivers();
      setCaregivers(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch caregivers');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!emailInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    setInviting(true);
    try {
      await inviteCaregiver(emailInput.trim());
      Alert.alert('Success', 'Caregiver invited successfully!');
      setEmailInput('');
      fetchCaregivers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to invite caregiver');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (assignmentId: string) => {
    Alert.alert('Confirm Revocation', 'Are you sure you want to revoke this caregiver?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        try {
          await revokeCaregiver(assignmentId);
          fetchCaregivers();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to revoke caregiver');
        }
      }},
    ]);
  };

  const togglePermission = async (assignmentId: string, permission: 'can_view_preferences' | 'can_view_speech_diary', currentValue: boolean) => {
    try {
      const updatePayload = { [permission]: !currentValue };
      await updateCaregiverPermissions(assignmentId, updatePayload);
      fetchCaregivers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update permissions');
    }
  };

  const renderItem = ({ item }: { item: CaregiverResponse }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Caregiver ID: {item.caregiver_id}</Text>
      <Text style={styles.status}>Status: {item.status.toUpperCase()}</Text>
      
      {item.status !== 'revoked' && (
        <>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>View Preferences</Text>
            <TouchableOpacity 
              style={[styles.toggleBtn, item.can_view_preferences ? styles.toggleOn : styles.toggleOff]}
              onPress={() => togglePermission(item.id, 'can_view_preferences', item.can_view_preferences)}
            >
              <Text style={styles.toggleBtnText}>{item.can_view_preferences ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>View Speech Diary</Text>
            <TouchableOpacity 
              style={[styles.toggleBtn, item.can_view_speech_diary ? styles.toggleOn : styles.toggleOff]}
              onPress={() => togglePermission(item.id, 'can_view_speech_diary', item.can_view_speech_diary)}
            >
              <Text style={styles.toggleBtnText}>{item.can_view_speech_diary ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {item.status !== 'revoked' && (
        <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(item.id)}>
          <Text style={styles.revokeBtnText}>Revoke Access</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigateTo('settings')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Caregiver Management</Text>
      </View>
      
      <View style={styles.inviteSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter caregiver email..."
          value={emailInput}
          onChangeText={setEmailInput}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} disabled={inviting}>
          <Text style={styles.inviteBtnText}>{inviting ? 'Inviting...' : 'Invite'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={caregivers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No caregivers found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 12,
    padding: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: '#007AFF',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  inviteSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFF',
    marginRight: 10,
  },
  inviteBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 8,
  },
  inviteBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  toggleOn: {
    backgroundColor: '#34C759',
  },
  toggleOff: {
    backgroundColor: '#FF3B30',
  },
  toggleBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  revokeBtn: {
    marginTop: 12,
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  revokeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  }
});
