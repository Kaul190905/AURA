import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, PermissionsAndroid, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Search, ListFilter, Play, Trash2, Pen, X, Square } from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors, neuSm, radius, spacing, fonts } from '../theme';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function SpeechDiaryScreen({ onBack }: { onBack: () => void }) {
  const styles = getStyles();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState([
    { id: '1', title: 'Lunchtime stress', time: 'Today, 2:30 PM', emotion: 'Anxious', text: 'The cafeteria was too loud today...', duration: '0:45' },
    { id: '2', title: 'Morning commute', time: 'Yesterday, 9:15 AM', emotion: 'Calm', text: 'Morning bus ride was peaceful.', duration: '1:12' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isNaming, setIsNaming] = useState(false);
  const [newRecordingName, setNewRecordingName] = useState('');
  const [recordTime, setRecordTime] = useState('00:00');
  const [currentRecordingPath, setCurrentRecordingPath] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        if (
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          return false;
        }
      } catch (err) {
        return false;
      }
    }
    return true;
  };

  const handleStartRecording = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;
    setIsRecording(true);
    
    try {
      await audioRecorderPlayer.startRecorder();
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)).substring(0, 5));
      });
    } catch (e) {
      console.log('Recording failed', e);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setCurrentRecordingPath(result);
    } catch (e) {
      console.log('Stop recording failed', e);
    }
    setIsRecording(false);
    setNewRecordingName('');
    setIsNaming(true);
  };

  const handleSaveRecording = () => {
    const finalName = newRecordingName.trim() || 'New Recording';
    const newEntry = {
      id: Date.now().toString(),
      title: finalName,
      time: 'Just now',
      emotion: 'Reflective',
      text: 'Recorded audio entry.',
      duration: recordTime,
      uri: currentRecordingPath
    };
    setEntries(prev => [newEntry, ...prev]);
    setIsNaming(false);
    setRecordTime('00:00');
  };

  const handlePlayPause = async (e: any) => {
    if (playingId === e.id) {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setPlayingId(null);
      return;
    }
    
    if (playingId) {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    }
    
    if (e.uri) {
      setPlayingId(e.id);
      try {
        await audioRecorderPlayer.startPlayer(e.uri);
        audioRecorderPlayer.addPlayBackListener((event) => {
          if (event.currentPosition >= event.duration) {
            audioRecorderPlayer.stopPlayer();
            audioRecorderPlayer.removePlayBackListener();
            setPlayingId(null);
          }
        });
      } catch (err) {
        console.log('Playback failed', err);
        setPlayingId(null);
      }
    }
  };

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.emotion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Speech Diary" onBack={onBack} />
      
      <View style={styles.searchBar}>
        <Search size={16} color={colors.mutedForeground} />
        <TextInput 
           style={styles.searchInput}
           placeholder="Search entries..."
           placeholderTextColor={colors.mutedForeground}
           value={searchQuery}
           onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity style={styles.filterBtn} onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.filterBtn}>
             <ListFilter size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Entries */}
        {filteredEntries.length === 0 ? (
          <Text style={styles.emptyText}>No entries found.</Text>
        ) : (
          filteredEntries.map(e => (
            <View key={e.id} style={[styles.card, neuSm]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitleText}>{e.title}</Text>
                  <Text style={styles.cardTime}>{e.time}</Text>
                  <Text style={styles.cardEmotion}>{e.emotion}</Text>
                </View>
                <View style={styles.actions}>
                  {e.uri ? (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handlePlayPause(e)}>
                      {playingId === e.id ? <Square size={16} color={colors.primary} /> : <Play size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.iconBtn}><Pen size={16} color={colors.mutedForeground} /></TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(e.id)}><Trash2 size={16} color={colors.riskHigh} /></TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardText}>{e.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Record Button */}
      <TouchableOpacity style={styles.recordFab} activeOpacity={0.85} onPress={handleStartRecording}>
        <Mic size={24} color={colors.background} />
      </TouchableOpacity>

      {/* Recording Modal */}
      <Modal visible={isRecording} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.recordingCard, neuSm]}>
            <View style={styles.recordingPulse}>
              <Mic size={32} color={colors.background} />
            </View>
            <Text style={styles.recordingTitle}>Recording...</Text>
            <Text style={styles.recordingTime}>{recordTime}</Text>
            
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopRecording}>
              <Text style={styles.stopBtnText}>Stop & Name</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Naming Modal */}
      <Modal visible={isNaming} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.namingCard, neuSm]}>
            <Text style={styles.namingTitle}>Name Your Recording</Text>
            <TextInput
              style={styles.namingInput}
              placeholder="e.g. Afternoon commute"
              placeholderTextColor={colors.mutedForeground}
              value={newRecordingName}
              onChangeText={setNewRecordingName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.lg }}>
              <TouchableOpacity style={[styles.stopBtn, { backgroundColor: colors.muted, flex: 1, alignItems: 'center' }]} onPress={() => setIsNaming(false)}>
                <Text style={[styles.stopBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.stopBtn, { flex: 1, alignItems: 'center' }]} onPress={handleSaveRecording}>
                <Text style={styles.stopBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.muted, borderRadius: radius.lg,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    height: 44, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, color: colors.foreground },
  filterBtn: { padding: spacing.xs },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  card: { backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  cardTitleText: { fontSize: 16, ...fonts.bold, color: colors.foreground, marginBottom: 4 },
  cardTitle: { fontSize: 14, ...fonts.bold },
  cardTime: { fontSize: 12, color: colors.mutedForeground, ...fonts.bold },
  cardEmotion: { fontSize: 12, color: colors.primary, marginTop: 2 },
  cardText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { padding: 4 },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, marginTop: spacing.xl },
  recordFab: {
    position: 'absolute', bottom: 80, right: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 999, elevation: 10,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  recordingCard: {
    backgroundColor: colors.background, padding: spacing.xl,
    borderRadius: radius.xl, alignItems: 'center', width: '80%',
  },
  recordingPulse: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recordingTitle: { fontSize: 18, ...fonts.bold, color: colors.foreground, marginBottom: 4 },
  recordingTime: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.xl },
  stopBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  stopBtnText: { color: colors.background, ...fonts.bold, fontSize: 14 },
  namingCard: {
    backgroundColor: colors.background, padding: spacing.xl,
    borderRadius: radius.xl, width: '85%',
  },
  namingTitle: { fontSize: 18, ...fonts.bold, color: colors.foreground, marginBottom: spacing.md },
  namingInput: {
    backgroundColor: colors.muted, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    color: colors.foreground, ...fonts.medium,
  },
});
