import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
  ScrollView, KeyboardAvoidingView, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider, signInWithCredential,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { useTheme } from '../context/ThemeContext';
import { PINK_CHROME, SILVER_CHROME } from '../theme/colors';

// ─── SETUP ───────────────────────────────────────────────────────────────────
// 1. Firebase Console → Authentication → Sign-in method → Enable Google
// 2. Google Cloud Console → OAuth 2.0 → เพิ่ม redirect URI:
//    https://auth.expo.io/@kantatee/heart-tracker
// 3. วาง Web Client ID ตรง webClientId ด้านล่าง
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_WEB_CLIENT_ID = '1045874927605-6sr2duffu3l0maji9c2a6ellgq1sv0dc.apps.googleusercontent.com';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { colors: C } = useTheme();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:  GOOGLE_WEB_CLIENT_ID,
    expoClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch(() => Alert.alert('Error', 'Google Sign-In ล้มเหลว'))
        .finally(() => setLoading(false));
    }
  }, [response]);

  const handleGoogle = async () => {
    if (GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')) {
      Alert.alert(
        'ต้อง config ก่อน',
        'ใส่ GOOGLE_WEB_CLIENT_ID ใน LoginScreen.js\nหรือกด "เข้าแบบ Guest" แทน',
      );
      return;
    }
    setLoading(true);
    await promptAsync();
    setLoading(false);
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch {
      Alert.alert('Error', 'ไม่สามารถเข้าแบบ Guest ได้');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.root, { backgroundColor: C.bg }]} keyboardShouldPersistTaps="handled">
      {/* Chrome Heart Hero */}
      <View style={s.hero}>
        <View style={s.chromeOrb}>
          <LinearGradient
            colors={SILVER_CHROME}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={s.chromeOuter}
          >
            <LinearGradient
              colors={['#FF6BA8','#FF2D78','#6B0030','#0E0005','#6B0030','#FF2D78','#FFB3D1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.chromeInner}
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
        <Text style={[s.tagline, { color: C.textMuted }]}>Real-time location sharing</Text>
      </View>

      {/* Buttons */}
      <View style={s.btnArea}>
        <TouchableOpacity
          onPress={handleGoogle}
          disabled={loading || !request}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#FF2D78','#8B0040']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.primaryBtn}>
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.primaryBtnText}>G  SIGN IN WITH GOOGLE</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGuest} style={[s.guestBtn, { borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={[s.guestText, { color: C.textMuted }]}>เข้าแบบ Guest (ไม่มี account)</Text>
        </TouchableOpacity>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1 },
  root:  { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },

  hero:  { alignItems: 'center', marginBottom: 56 },
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
  glowHalo: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 1.5, borderColor: 'rgba(255,45,120,0.35)',
  },
  titleWrap: { borderRadius: 4, paddingHorizontal: 2 },
  titleText: { fontSize: 52, fontWeight: '900', letterSpacing: 14, color: '#000', paddingHorizontal: 4 },
  subtitle: {
    fontSize: 22, fontWeight: '800', color: '#C0C0C0',
    letterSpacing: 18, marginTop: 4,
    textShadowColor: '#888', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 },
  },
  tagline: { fontSize: 10, letterSpacing: 3, marginTop: 12 },

  btnArea: { width: '100%', gap: 14 },
  primaryBtn: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  guestBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1,
  },
  guestText: { fontSize: 13 },
});
