import React, { useContext } from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SessionContext } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';

export default function CallScreen() {
  const { session }   = useContext(SessionContext);
  const { colors: C } = useTheme();

  const roomId    = session?.roomId ?? '';
  const jitsiRoom = 'heartlink-' + roomId.replace(/[^a-zA-Z0-9]/g, '');
  const url       = `https://meet.jit.si/${jitsiRoom}`;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: 'rgba(255,45,120,0.3)' }]}>
        <Text style={s.title}>📞  VIDEO CALL</Text>
        <Text style={[s.roomLabel, { color: C.textMuted }]}>ROOM · {session?.roomCode}</Text>
      </View>

      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        onPermissionRequest={req => req.grant(req.resources)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    paddingTop: 50, paddingBottom: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, alignItems: 'center',
  },
  title:     { color: '#FF2D78', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  roomLabel: { fontSize: 11, letterSpacing: 2, marginTop: 4 },
  waitText:  { fontSize: 15, fontWeight: '600' },
  subText:   { fontSize: 12, textAlign: 'center', paddingHorizontal: 32 },
});
