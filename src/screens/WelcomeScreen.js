import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert,
  Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ref, set, get, update, onDisconnect } from 'firebase/database';
import { db } from '../../firebase';
import { SessionContext } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, PINK_CHROME, SILVER_CHROME } from '../theme/colors';
import { generateRoomCode, generateUserId, AVATARS, MEMBER_COLORS } from '../utils/helpers';

const ROOM_TYPES = [
  { id: 'couple',  emoji: '💕', label: 'Partner', desc: 'Share location with your partner' },
  { id: 'friends', emoji: '👥', label: 'Friends',  desc: 'Unlimited friend group' },
];

export default function WelcomeScreen() {
  const { setSession } = useContext(SessionContext);
  const { isDark, toggleTheme, colors: C } = useTheme();
  const [userId]       = useState(() => generateUserId());

  const [nickname, setNickname]             = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('heart');
  const [roomType, setRoomType]             = useState('couple');
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleCreate = async () => {
    if (!nickname.trim()) { Alert.alert('', 'Please enter your name 💕'); return; }
    setLoading(true);
    try {
      const roomCode = generateRoomCode();
      const roomId   = 'r_' + Date.now().toString(36);
      const color    = MEMBER_COLORS[0];

      await set(ref(db, `rooms/${roomId}/info`), {
        code: roomCode, createdAt: Date.now(), hostId: userId, type: roomType,
      });
      const memberRef = ref(db, `rooms/${roomId}/members/${userId}`);
      await set(memberRef, {
        nickname: nickname.trim(), avatar: selectedAvatar,
        color, sharing: true, status: '🖤 Online',
        lat: null, lng: null, updatedAt: Date.now(), battery: null,
      });
      await onDisconnect(memberRef).update({ sharing: false });

      setSession({ userId, roomId, roomCode, nickname: nickname.trim(), avatar: selectedAvatar, color, roomType });
    } catch {
      Alert.alert('Error', 'Could not create room, please try again');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!nickname.trim())              { Alert.alert('', 'Please enter your name 💕'); return; }
    if (joinCode.trim().length !== 6)  { Alert.alert('', 'Code must be 6 characters'); return; }
    setLoading(true);
    try {
      const snap = await get(ref(db, 'rooms'));
      if (!snap.exists()) { Alert.alert('', 'Room not found'); setLoading(false); return; }

      let foundId = null, foundType = 'couple';
      snap.forEach(child => {
        if (child.val()?.info?.code === joinCode.trim().toUpperCase()) {
          foundId   = child.key;
          foundType = child.val()?.info?.type ?? 'couple';
        }
      });
      if (!foundId) { Alert.alert('', 'Invalid code'); setLoading(false); return; }

      const membersSnap = await get(ref(db, `rooms/${foundId}/members`));
      const count = membersSnap.exists() ? Object.keys(membersSnap.val()).length : 0;

      // ถ้าเป็น couple room และมี 2 คนแล้ว ห้ามเข้า
      if (foundType === 'couple' && count >= 2) {
        Alert.alert('💕 Room Full', 'Couple room is full (max 2 people)');
        setLoading(false); return;
      }

      const color    = MEMBER_COLORS[count % MEMBER_COLORS.length];
      const memberRef = ref(db, `rooms/${foundId}/members/${userId}`);
      await set(memberRef, {
        nickname: nickname.trim(), avatar: selectedAvatar,
        color, sharing: true, status: '🖤 Online',
        lat: null, lng: null, updatedAt: Date.now(), battery: null,
      });
      await onDisconnect(memberRef).update({ sharing: false });

      const code = snap.child(foundId).val().info.code;
      setSession({ userId, roomId: foundId, roomCode: code, nickname: nickname.trim(), avatar: selectedAvatar, color, roomType: foundType });
      setJoinModalVisible(false);
    } catch {
      Alert.alert('Error', 'Something went wrong, please try again');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Chrome Heart Hero */}
          <View style={s.hero}>
            <View style={s.chromeOrb}>
              <LinearGradient colors={SILVER_CHROME} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.chromeOuter}>
                <LinearGradient
                  colors={['#FF6BA8','#FF2D78','#6B0030','#0E0005','#6B0030','#FF2D78','#FFB3D1']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.chromeInner}
                >
                  <Text style={s.heartGlyph}>♥</Text>
                </LinearGradient>
              </LinearGradient>
              <View style={s.sheen1} />
              <View style={s.sheen2} />
              <View style={s.glowHalo} />
            </View>
            <LinearGradient colors={PINK_CHROME} start={{x:0,y:0}} end={{x:1,y:0}} style={s.titleWrap}>
              <Text style={s.titleText}>HEART</Text>
            </LinearGradient>
            <Text style={s.subtitle}>L I N K</Text>
          </View>

          {/* Nickname */}
          <Text style={[s.label, { color: '#FF2D78' }]}>NICKNAME</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
            placeholder="Your name..."
            placeholderTextColor={C.textMuted}
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            autoCorrect={false}
          />

          {/* Avatar */}
          <Text style={[s.label, { color: '#FF2D78' }]}>AVATAR</Text>
          <View style={s.avatarRow}>
            {AVATARS.map(av => (
              <TouchableOpacity
                key={av.id}
                style={[s.avatarBtn, { backgroundColor: C.surface, borderColor: '#222' },
                  selectedAvatar === av.id && s.avatarSelected]}
                onPress={() => setSelectedAvatar(av.id)}
                activeOpacity={0.7}
              >
                <Text style={s.avatarEmoji}>{av.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Room Type */}
          <Text style={[s.label, { color: '#FF2D78' }]}>ROOM TYPE</Text>
          <View style={s.roomTypeRow}>
            {ROOM_TYPES.map(rt => (
              <TouchableOpacity
                key={rt.id}
                style={[s.rtBtn, { backgroundColor: C.surface, borderColor: roomType === rt.id ? '#FF2D78' : '#222' },
                  roomType === rt.id && s.rtSelected]}
                onPress={() => setRoomType(rt.id)}
                activeOpacity={0.7}
              >
                <Text style={s.rtEmoji}>{rt.emoji}</Text>
                <Text style={[s.rtLabel, { color: roomType === rt.id ? '#FF2D78' : C.textMuted }]}>{rt.label}</Text>
                <Text style={[s.rtDesc, { color: C.textMuted }]}>{rt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Create */}
          <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.8} style={{ marginTop: 28 }}>
            <LinearGradient colors={['#FF2D78','#8B0040']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>{loading ? '...' : '✦  CREATE ROOM'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setJoinModalVisible(true)} style={[s.secondaryBtn, { borderColor: C.border }]} activeOpacity={0.7}>
            <Text style={s.secondaryBtnText}>JOIN WITH CODE</Text>
          </TouchableOpacity>


        </ScrollView>
      </KeyboardAvoidingView>

      {/* Theme toggle — floats on top of everything */}
      <TouchableOpacity style={s.themeBtn} onPress={toggleTheme} activeOpacity={0.7}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color="#FF2D78" />
      </TouchableOpacity>

      {/* Join Modal */}
      <Modal visible={joinModalVisible} transparent animationType="slide">
        <View style={[s.overlay, { backgroundColor: C.overlay }]}>
          <View style={[s.modal, { backgroundColor: C.surface }]}>
            <Text style={s.modalTitle}>ENTER CODE</Text>
            <TextInput
              style={[s.input, s.codeInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
              placeholder="A1B2C3"
              placeholderTextColor={C.textMuted}
              value={joinCode}
              onChangeText={t => setJoinCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <TouchableOpacity onPress={handleJoin} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={['#FF2D78','#8B0040']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>{loading ? '...' : 'JOIN  ♥'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setJoinModalVisible(false); setJoinCode(''); }} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, letterSpacing: 2, fontSize: 12 }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingHorizontal: 24, paddingBottom: 40 },

  themeBtn: {
    position: 'absolute', top: 54, right: 20, zIndex: 999,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,45,120,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  chromeOrb: { width: 150, height: 150, marginBottom: 18, alignItems: 'center', justifyContent: 'center' },
  chromeOuter: {
    width: 144, height: 144, borderRadius: 72, padding: 4,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF2D78', shadowRadius: 30, shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 }, elevation: 22,
  },
  chromeInner: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center' },
  heartGlyph: {
    fontSize: 76, color: '#FFD0E6',
    textShadowColor: '#FF2D78', textShadowRadius: 22, textShadowOffset: { width: 0, height: 3 },
  },
  sheen1: {
    position: 'absolute', top: 14, left: 30, width: 48, height: 20,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '-38deg' }],
  },
  sheen2: {
    position: 'absolute', top: 26, left: 50, width: 22, height: 8,
    borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.38)', transform: [{ rotate: '-38deg' }],
  },
  glowHalo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderColor: 'rgba(255,45,120,0.35)' },
  titleWrap: { borderRadius: 4, paddingHorizontal: 2 },
  titleText: { fontSize: 52, fontWeight: '900', letterSpacing: 14, color: '#000', paddingHorizontal: 4 },
  subtitle:  { fontSize: 22, fontWeight: '800', color: '#C0C0C0', letterSpacing: 18, marginTop: 4 },

  label: { fontSize: 10, letterSpacing: 3, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, letterSpacing: 1 },
  codeInput: { textAlign: 'center', fontSize: 26, letterSpacing: 10 },

  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  avatarBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarSelected: {
    borderColor: '#FF2D78', borderWidth: 2,
    backgroundColor: 'rgba(255,45,120,0.12)',
    shadowColor: '#FF2D78', shadowRadius: 8, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  avatarEmoji: { fontSize: 26 },

  roomTypeRow: { flexDirection: 'row', gap: 12 },
  rtBtn: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', gap: 4,
  },
  rtSelected: { backgroundColor: 'rgba(255,45,120,0.1)' },
  rtEmoji:  { fontSize: 28 },
  rtLabel:  { fontSize: 13, fontWeight: '800' },
  rtDesc:   { fontSize: 10, textAlign: 'center' },

  primaryBtn:     { borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 4 },
  secondaryBtn:   { marginTop: 12, borderRadius: 10, paddingVertical: 16, borderWidth: 1, alignItems: 'center' },
  secondaryBtnText: { color: '#FF2D78', fontWeight: '700', fontSize: 13, letterSpacing: 3 },

  signOutBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  signOutText: { fontSize: 12, letterSpacing: 1 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.3)',
    padding: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { color: '#FF2D78', fontSize: 18, fontWeight: '900', letterSpacing: 4, textAlign: 'center', marginBottom: 20 },
});
