import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, Modal, Alert, ScrollView, Switch, Share,
} from 'react-native';
import { ref, update, onValue, set } from 'firebase/database';
import * as Location from 'expo-location';
import { db } from '../../firebase';
import { SessionContext } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PINK_CHROME } from '../theme/colors';
import { getAvatarEmoji, MOODS } from '../utils/helpers';

const RADII = [200, 500, 1000, 2000];

export default function ProfileScreen() {
  const { session, setSession } = useContext(SessionContext);
  const { isDark, toggleTheme, colors: C } = useTheme();
  const { userId = '', roomId = '', roomCode = '', nickname = '', avatar = 'heart', color = '#FF2D78', roomType = 'couple' } = session ?? {};

  const [status,      setStatus]      = useState('🖤 Online');
  const [mood,        setMood]        = useState('🖤');
  const [sharing,     setSharing]     = useState(true);
  const [safeZone,    setSafeZone]    = useState(null);
  const [memberCount, setMemberCount] = useState(0);

  const [statusModal,   setStatusModal]   = useState(false);
  const [statusDraft,   setStatusDraft]   = useState('');
  const [safeZoneModal, setSafeZoneModal] = useState(false);
  const [safeRadius,    setSafeRadius]    = useState(500);
  const [breakUpModal,  setBreakUpModal]  = useState(false);

  useEffect(() => {
    if (!roomId) return;
    return onValue(ref(db, `rooms/${roomId}/members/${userId}`), snap => {
      if (!snap.exists()) return;
      const d = snap.val();
      setStatus(d.status ?? '🖤 Online');
      setMood(d.mood ?? '🖤');
      setSharing(d.sharing !== false);
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    return onValue(ref(db, `rooms/${roomId}/members`), snap => {
      if (snap.exists()) setMemberCount(Object.keys(snap.val()).length);
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    return onValue(ref(db, `rooms/${roomId}/safeZone`), snap => {
      if (snap.exists()) setSafeZone(snap.val());
    });
  }, []);

  const saveStatus = async () => {
    const s = statusDraft.trim() || '🖤 Online';
    setStatus(s);
    await update(ref(db, `rooms/${roomId}/members/${userId}`), { status: s });
    setStatusModal(false);
  };

  const saveMood = async (emoji) => {
    setMood(emoji);
    await update(ref(db, `rooms/${roomId}/members/${userId}`), { mood: emoji });
  };

  const toggleSharing = async (val) => {
    setSharing(val);
    await update(ref(db, `rooms/${roomId}/members/${userId}`), { sharing: val });
  };

  const enableSafeZone = async () => {
    let lat = 13.7563, lng = 100.5018;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    } catch {}
    const zone = { lat, lng, radius: safeRadius, enabled: true };
    await update(ref(db, `rooms/${roomId}/safeZone`), zone);
    setSafeZone(zone);
    Alert.alert('✓ Safe Zone', `Safe zone set with radius ${safeRadius >= 1000 ? safeRadius / 1000 + ' km' : safeRadius + ' m'}`);
    setSafeZoneModal(false);
  };

  const disableSafeZone = async () => {
    await update(ref(db, `rooms/${roomId}/safeZone`), { enabled: false });
    setSafeZone(null);
  };

  const shareRoomCode = () => {
    Share.share({
      message: `Join me on HeartLink! 💕\nCode: ${roomCode}`,
      title: 'HeartLink Room Code',
    });
  };

  const leaveRoom = () => {
    Alert.alert('Leave Room', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          await update(ref(db, `rooms/${roomId}/members/${userId}`), { sharing: false });
          setSession(null);
        },
      },
    ]);
  };

  const breakUp = async () => {
    // Clear session first so the room deletion listener doesn't show the alert for us
    setSession(null);
    try {
      await set(ref(db, `rooms/${roomId}`), null);
    } catch {}
  };


  const Row = ({ label, value, onPress, right }) => (
    <TouchableOpacity style={[st.settingRow, { borderTopColor: C.surface3 }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={[st.rowLabel, { color: C.text }]}>{label}</Text>
      {right ?? <Text style={[st.rowValue, { color: C.textMuted }]}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color={C.textMuted} />}
    </TouchableOpacity>
  );

  if (!session) return null;

  return (
    <SafeAreaView style={[st.root, { backgroundColor: C.bg }]}>
      <ScrollView>
        {/* Header */}
        <View style={[st.header, { borderBottomColor: C.border }]}>
          <Text style={st.headerTitle}>PROFILE</Text>
        </View>

        {/* Avatar hero */}
        <View style={st.hero}>
          <LinearGradient colors={PINK_CHROME} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.avatarRingGrad}>
            <View style={[st.avatarInner, { backgroundColor: C.surface }]}>
              <Text style={st.bigEmoji}>{getAvatarEmoji(avatar)}</Text>
            </View>
          </LinearGradient>
          <Text style={[st.heroName, { color }]}>{nickname}</Text>
          <View style={[st.colorPill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <View style={[st.colorDot, { backgroundColor: color }]} />
            <Text style={[st.colorLabel, { color }]}>#{color.substring(1)}</Text>
          </View>
          {roomType && (
            <View style={[st.typePill, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Text style={st.typePillText}>{roomType === 'couple' ? '💕 Couple Room' : '👥 Friends Room'}</Text>
            </View>
          )}
        </View>

        {/* MOOD */}
        <Text style={[st.section, { color: '#FF2D78' }]}>MOOD</Text>
        <View style={[st.card, { backgroundColor: C.surface, borderColor: C.surface3 }]}>
          <View style={st.moodGrid}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[st.moodBtn, { backgroundColor: C.surface2, borderColor: C.surface3 },
                  mood === m.emoji && st.moodSelected]}
                onPress={() => saveMood(m.emoji)}
                activeOpacity={0.7}
              >
                <Text style={st.moodEmoji}>{m.emoji}</Text>
                <Text style={[st.moodLabel, { color: C.textMuted }, mood === m.emoji && st.moodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STATUS */}
        <Text style={[st.section, { color: '#FF2D78' }]}>STATUS</Text>
        <View style={[st.card, { backgroundColor: C.surface, borderColor: C.surface3 }]}>
          <Row label="Vibe" value={status} onPress={() => { setStatusDraft(status); setStatusModal(true); }} />
        </View>

        {/* APPEARANCE */}
        <Text style={[st.section, { color: '#FF2D78' }]}>APPEARANCE</Text>
        <View style={[st.card, { backgroundColor: C.surface, borderColor: C.surface3 }]}>
          <View style={[st.settingRow, { borderTopColor: C.surface3 }]}>
            <Text style={[st.rowLabel, { color: C.text }]}>{isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ddd', true: 'rgba(255,45,120,0.4)' }}
              thumbColor={isDark ? '#FF2D78' : '#FF2D78'}
            />
          </View>
        </View>

        {/* LOCATION */}
        <Text style={[st.section, { color: '#FF2D78' }]}>LOCATION</Text>
        <View style={[st.card, { backgroundColor: C.surface, borderColor: C.surface3 }]}>
          <View style={st.settingRow}>
            <Text style={[st.rowLabel, { color: C.text }]}>Share Location</Text>
            <Switch
              value={sharing}
              onValueChange={toggleSharing}
              trackColor={{ false: C.surface3, true: 'rgba(255,45,120,0.4)' }}
              thumbColor={sharing ? '#FF2D78' : '#555'}
            />
          </View>
          <View style={[st.settingRow, { borderTopWidth: 1, borderTopColor: C.surface3 }]}>
            <Text style={[st.rowLabel, { color: C.text }]}>Safe Zone</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {safeZone?.enabled && (
                <TouchableOpacity onPress={disableSafeZone}>
                  <Text style={{ color: '#FF3B30', fontSize: 12 }}>OFF</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setSafeZoneModal(true)}>
                <Text style={{ color: '#FF2D78', fontSize: 12 }}>
                  {safeZone?.enabled ? `✓ ${safeZone.radius >= 1000 ? safeZone.radius / 1000 + 'km' : safeZone.radius + 'm'}` : 'SET UP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ROOM */}
        <Text style={[st.section, { color: '#FF2D78' }]}>ROOM</Text>
        <View style={[st.card, { backgroundColor: C.surface, borderColor: C.surface3 }]}>
          <Row
            label="Room Code"
            right={
              <TouchableOpacity onPress={shareRoomCode} style={st.codeChip}>
                <Text style={st.codeText}>{roomCode}</Text>
                <Ionicons name="share-outline" size={14} color="#FF2D78" />
              </TouchableOpacity>
            }
          />
          <View style={[st.settingRow, { borderTopWidth: 1, borderTopColor: C.surface3 }]}>
            <Text style={[st.rowLabel, { color: C.text }]}>Members</Text>
            <Text style={[st.rowValue, { color: C.textMuted }]}>{memberCount} คน</Text>
          </View>
        </View>

        {/* Break up — only for couple rooms */}
        {roomType === 'couple' && (
          <>
            <Text style={[st.section, { color: '#FF2D78' }]}>RELATIONSHIP</Text>
            <TouchableOpacity
              style={[st.breakUpBtn]}
              onPress={() => setBreakUpModal(true)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#1a0010', '#2e0020']} style={st.breakUpGrad}>
                <Text style={st.breakUpEmoji}>💔</Text>
                <Text style={st.breakUpText}>ตัดความสัมพันธ์</Text>
                <Text style={st.breakUpSub}>ลบ room ออกทั้งคู่</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Leave */}
        <TouchableOpacity style={[st.leaveBtn, { borderColor: 'rgba(255,59,48,0.35)' }]} onPress={leaveRoom} activeOpacity={0.7}>
          <Ionicons name="exit-outline" size={18} color="#FF3B30" />
          <Text style={st.leaveBtnText}>LEAVE ROOM</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Status modal */}
      <Modal visible={statusModal} transparent animationType="slide">
        <View style={[st.overlay, { backgroundColor: C.overlay }]}>
          <View style={[st.modal, { backgroundColor: C.surface }]}>
            <Text style={st.modalTitle}>YOUR VIBE</Text>
            <TextInput
              style={[st.input, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
              value={statusDraft}
              onChangeText={setStatusDraft}
              placeholder="🖤 what's your vibe..."
              placeholderTextColor={C.textMuted}
              maxLength={40}
              autoFocus
            />
            <TouchableOpacity onPress={saveStatus} activeOpacity={0.85}>
              <LinearGradient colors={['#FF2D78', '#8B0040']} style={st.confirmBtn}>
                <Text style={st.confirmText}>SAVE  ♥</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStatusModal(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, letterSpacing: 2, fontSize: 12 }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Safe zone modal */}
      <Modal visible={safeZoneModal} transparent animationType="slide">
        <View style={[st.overlay, { backgroundColor: C.overlay }]}>
          <View style={[st.modal, { backgroundColor: C.surface }]}>
            <Text style={st.modalTitle}>SAFE ZONE</Text>
            <Text style={[st.modalDesc, { color: C.textMuted }]}>Get notified when you leave the designated area</Text>
            <Text style={[st.subLabel, { color: '#FF2D78' }]}>RADIUS</Text>
            {RADII.map(r => (
              <TouchableOpacity
                key={r}
                style={[st.radiusOption, { backgroundColor: C.surface2, borderColor: C.surface3 },
                  safeRadius === r && st.radiusSelected]}
                onPress={() => setSafeRadius(r)}
              >
                <Text style={[st.radiusText, { color: C.textMuted }, safeRadius === r && { color: '#FF2D78', fontWeight: '800' }]}>
                  {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                </Text>
                {safeRadius === r && <Ionicons name="checkmark" size={14} color="#FF2D78" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => enableSafeZone()} activeOpacity={0.85} style={{ marginTop: 8 }}>
              <LinearGradient colors={['#FF2D78', '#8B0040']} style={st.confirmBtn}>
                <Text style={st.confirmText}>ENABLE  ♥</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSafeZoneModal(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, letterSpacing: 2, fontSize: 12 }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Break up confirmation modal */}
      <Modal visible={breakUpModal} transparent animationType="fade">
        <View style={[st.overlay, { backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[st.breakUpConfirm, { backgroundColor: C.surface }]}>
            <Text style={{ fontSize: 52, textAlign: 'center' }}>💔</Text>
            <Text style={st.buConfirmTitle}>ตัดความสัมพันธ์?</Text>
            <Text style={[st.buConfirmSub, { color: C.textMuted }]}>
              The room will be deleted. Both of you will leave HeartLink. This cannot be undone.
            </Text>
            <TouchableOpacity
              onPress={() => { setBreakUpModal(false); breakUp(); }}
              activeOpacity={0.85}
              style={{ marginTop: 20 }}
            >
              <LinearGradient colors={['#8B0000', '#FF0040']} style={st.buConfirmBtn}>
                <Text style={st.buConfirmBtnText}>💔  ตัดเลย</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBreakUpModal(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>Cancel — still in love ♥</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { color: '#FF2D78', fontSize: 18, fontWeight: '900', letterSpacing: 5 },

  hero: { alignItems: 'center', paddingVertical: 32 },
  avatarRingGrad: { padding: 3, borderRadius: 60 },
  avatarInner: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  bigEmoji: { fontSize: 56 },
  heroName:  { fontSize: 22, fontWeight: '800', marginTop: 14, letterSpacing: 2 },
  colorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1,
  },
  colorDot:   { width: 8, height: 8, borderRadius: 4 },
  colorLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  typePill: {
    marginTop: 8, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1,
  },
  typePillText: { color: '#FF2D78', fontSize: 12, fontWeight: '700' },

  section: { fontSize: 9, letterSpacing: 3.5, fontWeight: '800', marginTop: 20, marginBottom: 8, paddingHorizontal: 20 },
  card:    { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLabel:   { fontSize: 14 },
  rowValue:   { fontSize: 13 },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, paddingBottom: 8, gap: 8 },
  moodBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, width: '22%' },
  moodSelected: { borderColor: 'rgba(255,45,120,0.6)', backgroundColor: 'rgba(255,45,120,0.1)' },
  moodEmoji:       { fontSize: 22 },
  moodLabel:       { fontSize: 8, marginTop: 4, fontWeight: '600' },
  moodLabelActive: { color: '#FF2D78' },

  codeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,45,120,0.08)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.3)',
  },
  codeText: { color: '#FF2D78', fontWeight: '900', fontSize: 15, letterSpacing: 4 },

  breakUpBtn: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  breakUpGrad: { padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,0,64,0.4)', borderRadius: 16 },
  breakUpEmoji: { fontSize: 32, marginBottom: 4 },
  breakUpText:  { color: '#FF4060', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  breakUpSub:   { color: '#662030', fontSize: 11, marginTop: 3, letterSpacing: 1 },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 20, marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1,
  },
  leaveBtnText: { color: '#FF3B30', fontWeight: '800', fontSize: 13, letterSpacing: 3 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.3)',
    padding: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { color: '#FF2D78', fontSize: 18, fontWeight: '900', letterSpacing: 4, textAlign: 'center', marginBottom: 8 },
  modalDesc:  { fontSize: 12, textAlign: 'center', letterSpacing: 1, marginBottom: 20 },
  subLabel:   { fontSize: 9, letterSpacing: 3, fontWeight: '700', marginBottom: 10 },

  input: { borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16, borderWidth: 1 },
  confirmBtn:  { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 3 },

  radiusOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  radiusSelected: { borderColor: 'rgba(255,45,120,0.5)', backgroundColor: 'rgba(255,45,120,0.08)' },
  radiusText: { fontSize: 14 },

  breakUpConfirm: { borderRadius: 24, padding: 32, marginHorizontal: 24, alignItems: 'center' },
  buConfirmTitle: { color: '#FF2D78', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 8, textAlign: 'center' },
  buConfirmSub:   { fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  buConfirmBtn:   { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center' },
  buConfirmBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 2 },

  inputBg: {},
});
