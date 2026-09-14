import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { ref, push, onValue } from 'firebase/database';
import * as Notifications from 'expo-notifications';
import { db } from '../../firebase';
import { SessionContext } from '../context/SessionContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarEmoji } from '../utils/helpers';

export default function ChatScreen() {
  const { session } = useContext(SessionContext);
  const { userId = '', roomId = '', roomCode = '', nickname = '', avatar = 'heart' } = session ?? {};

  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const flatRef      = useRef(null);
  const isFirstLoad  = useRef(true);
  const knownIds     = useRef(new Set());

  useEffect(() => {
    if (!roomId) return;
    return onValue(ref(db, `rooms/${roomId}/chat`), snap => {
      if (!snap.exists()) return;
      const msgs = Object.entries(snap.val())
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (isFirstLoad.current) {
        msgs.forEach(m => knownIds.current.add(m.id));
        isFirstLoad.current = false;
      } else {
        msgs.forEach(m => {
          if (!knownIds.current.has(m.id) && m.userId !== userId) {
            knownIds.current.add(m.id);
            if (Platform.OS !== 'web') {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: m.nickname,
                  body: m.text || '📍 Shared a location',
                  sound: true,
                },
                trigger: null,
              });
            }
          }
        });
      }

      setMessages(msgs);
    });
  }, []);

  const send = async (quickText = null) => {
    const msgText = quickText ?? text.trim();
    if (!msgText) return;
    const payload = {
      userId, nickname, avatar,
      text: msgText,
      timestamp: Date.now(),
      pinLat: null,
      pinLng: null,
    };
    await push(ref(db, `rooms/${roomId}/chat`), payload);
    if (!quickText) setText('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendHeart = () => send('❤️ Sending you my heart!');
  const sendSOS   = () => send('🆘 SOS! I need help!');

  const timeStr = (ts) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const renderItem = ({ item }) => {
    const isMe = item.userId === userId;
    return (
      <View style={[s.row, isMe && s.rowMe]}>
        {!isMe && (
          <View style={s.avatarRing}>
            <Text style={s.avatarEmoji}>{getAvatarEmoji(item.avatar)}</Text>
          </View>
        )}
        <View style={[s.bubble, isMe && s.bubbleMe]}>
          {!isMe && <Text style={s.bubbleName}>{item.nickname}</Text>}
          {!!item.text && (
            <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.text}</Text>
          )}
          {item.pinLat && (
            <View style={s.pinBadge}>
              <Ionicons name="location" size={12} color="#FF2D78" />
              <Text style={s.pinBadgeText}>Shared location</Text>
            </View>
          )}
          <Text style={[s.time, isMe && { textAlign: 'right' }]}>{timeStr(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  if (!session) return null;

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerHeart}>♥</Text>
        <View>
          <Text style={s.headerTitle}>CHAT</Text>
          <Text style={s.headerSub}>ROOM  {roomCode}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>♥  No messages yet</Text>
            <Text style={s.emptySub}>Start chatting with your group</Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Quick buttons */}
        <View style={s.quickRow}>
          <TouchableOpacity style={s.quickBtn} onPress={sendHeart} activeOpacity={0.75}>
            <Text style={s.quickText}>❤️  HEART</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn, s.quickSOS]} onPress={sendSOS} activeOpacity={0.75}>
            <Text style={[s.quickText, { color: '#FF3B30' }]}>🆘  SOS</Text>
          </TouchableOpacity>
        </View>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#333"
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity onPress={() => send()} activeOpacity={0.8}>
            <LinearGradient colors={['#FF2D78', '#8B0040']} style={s.sendBtn}>
              <Ionicons name="send" size={17} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,45,120,0.2)',
  },
  headerHeart: {
    fontSize: 30, color: '#FF2D78',
    textShadowColor: '#FF2D78', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 },
  },
  headerTitle: { color: '#FF2D78', fontSize: 18, fontWeight: '900', letterSpacing: 5 },
  headerSub:   { color: '#333', fontSize: 10, letterSpacing: 3, marginTop: 1 },

  list: { padding: 14, gap: 10, paddingBottom: 8 },

  row:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMe: { flexDirection: 'row-reverse' },

  avatarRing: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,45,120,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 18 },

  bubble: {
    maxWidth: '72%', backgroundColor: '#111', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: 'rgba(255,45,120,0.14)',
    borderColor: 'rgba(255,45,120,0.28)',
    borderBottomRightRadius: 4, borderBottomLeftRadius: 16,
  },
  bubbleName: { color: '#FF2D78', fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  bubbleText:   { color: '#DDD', fontSize: 14.5, lineHeight: 21 },
  bubbleTextMe: { color: '#FFB6D9' },

  pinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, backgroundColor: 'rgba(255,45,120,0.1)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  pinBadgeText: { color: '#FF2D78', fontSize: 11 },
  time: { color: '#333', fontSize: 9.5, marginTop: 5 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#FF2D78', fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  emptySub:  { color: '#333', fontSize: 12, marginTop: 8, letterSpacing: 1 },

  quickRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#000',
    borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.18)',
  },
  quickBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.35)',
    backgroundColor: 'rgba(255,45,120,0.07)',
    alignItems: 'center',
  },
  quickSOS: {
    borderColor: 'rgba(255,59,48,0.35)',
    backgroundColor: 'rgba(255,59,48,0.07)',
  },
  quickText: { color: '#FF2D78', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, backgroundColor: '#000',
  },
  input: {
    flex: 1, backgroundColor: '#0E0E0E', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 11,
    color: '#E8E8E8', fontSize: 14.5, maxHeight: 100,
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.2)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
});
