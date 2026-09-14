import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Modal, Animated, Vibration, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Battery from 'expo-battery';
import * as ImagePicker from 'expo-image-picker';
import { ref, onValue, update, push, set } from 'firebase/database';
import { db } from '../../firebase';
import { SessionContext } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  calculateDistance, formatDistance,
  REACTIONS, getAvatarEmoji,
} from '../utils/helpers';

// ─── Cloudinary Config ────────────────────────────────────────────────────────
// 1. สมัคร cloudinary.com
// 2. Settings → Upload → Upload Presets → Add unsigned preset
// 3. ใส่ cloud name และ preset name ด้านล่าง
const CLOUD_NAME    = 'dmlm39nw3';
const UPLOAD_PRESET = 'heartlink';
// ─────────────────────────────────────────────────────────────────────────────

async function uploadToCloudinary(base64) {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: `data:image/jpeg;base64,${base64}`,
      upload_preset: UPLOAD_PRESET,
    }),
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Upload failed');
  return data.secure_url;
}

// ── Leaflet dark map HTML ─────────────────────────────────────────────────────
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;background:#000}
.leaflet-container{background:#0d0d0d}
.leaflet-control-attribution,.leaflet-control-zoom{display:none}
.mp{text-align:center;cursor:pointer}
.pb{width:44px;height:44px;border-radius:50%;background:#0a0a0a;
    display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto}
.pn{font-size:10px;font-weight:800;margin-top:2px;
    font-family:-apple-system,sans-serif;white-space:nowrap}
.db{font-size:9px;font-weight:800;border-radius:8px;
    padding:1px 5px;margin-top:1px;font-family:-apple-system,sans-serif;display:inline-block}
.sm{font-size:28px;line-height:1}
.mp,.sm,.pm,.ci{filter:invert(100%) hue-rotate(180deg)}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
document.getElementById('map').style.filter='invert(100%) hue-rotate(180deg) brightness(90%) contrast(85%) saturate(0.8)';
map.setView([13.7563,100.5018],14);

var MM={},TL={},SC=null,PPIN=null,CIs={},centered=false,myLat=null,myLng=null;

function cd(a,b,c,d){
  var R=6371e3,p1=a*Math.PI/180,p2=c*Math.PI/180;
  var dp=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180;
  var x=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function fd(m){return m<1000?Math.round(m)+'m':(m/1000).toFixed(1)+'km'}

function mkIcon(m){
  var c=m.color||'#FF2D78';
  var dist=(myLat&&m.lat)?fd(cd(myLat,myLng,m.lat,m.lng)):'';
  var mood=m.mood?'<div style="font-size:13px;margin-top:1px">'+m.mood+'</div>':'';
  var html='<div class="mp">'
    +'<div class="pb" style="border:2.5px solid '+c+';box-shadow:0 0 10px '+c+'">'+m.emoji+'</div>'
    +'<div class="pn" style="color:'+c+';text-shadow:0 0 6px '+c+'">'+m.nickname+'</div>'
    +(dist?'<div class="db" style="color:'+c+';background:'+c+'22">'+dist+'</div>':'')
    +mood+'</div>';
  return L.divIcon({html:html,iconSize:[80,84],iconAnchor:[40,74],className:''});
}

function updateMembers(members,myLoc){
  if(myLoc){myLat=myLoc.lat;myLng=myLoc.lng}
  Object.keys(members).forEach(function(uid){
    var m=members[uid];
    if(!m.lat||!m.lng||!m.sharing){
      if(MM[uid]){map.removeLayer(MM[uid]);delete MM[uid]}
      return;
    }
    var icon=mkIcon(m);
    if(MM[uid]){MM[uid].setLatLng([m.lat,m.lng]).setIcon(icon)}
    else{
      (function(id){
        MM[id]=L.marker([m.lat,m.lng],{icon:icon}).addTo(map)
          .on('click',function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap',uid:id}))});
      })(uid);
    }
  });
  if(myLat&&myLng&&!centered){map.setView([myLat,myLng],16);centered=true}
}

function updateTrails(trails,members){
  Object.keys(trails).forEach(function(uid){
    var raw=trails[uid];
    var pts=Array.isArray(raw)?raw:Object.values(raw);
    if(!pts||pts.length<2)return;
    var c=(members[uid]&&members[uid].color)||'#FF2D78';
    if(TL[uid])map.removeLayer(TL[uid]);
    TL[uid]=L.polyline(pts.map(function(p){return[p.lat,p.lng]}),{color:c,weight:2,opacity:0.7,dashArray:'6,4'}).addTo(map);
  });
}

function updateSafeZone(zone){
  if(SC){map.removeLayer(SC);SC=null}
  if(zone&&zone.enabled){
    SC=L.circle([zone.lat,zone.lng],{radius:zone.radius,color:'#FF2D78',fillColor:'#FF2D78',fillOpacity:0.05,weight:1.5,opacity:0.6}).addTo(map);
  }
}

function addSOS(sos){
  var icon=L.divIcon({html:'<div class="sm">🆘</div>',iconSize:[34,34],className:''});
  L.marker([sos.lat,sos.lng],{icon:icon}).addTo(map);
}

function addPin(d){
  if(PPIN)map.removeLayer(PPIN);
  var icon=L.divIcon({
    html:'<div class="pm" style="text-align:center"><div style="font-size:26px">📍</div>'
        +'<div style="font-size:9px;color:#FF2D78;font-weight:800;white-space:nowrap;font-family:-apple-system,sans-serif">'+d.nickname+'</div></div>',
    iconSize:[60,42],iconAnchor:[30,42],className:''
  });
  PPIN=L.marker([d.lat,d.lng],{icon:icon}).addTo(map);
  map.flyTo([d.lat,d.lng],16,{duration:0.6});
}

function updateCheckIns(list){
  var ids=list.map(function(d){return d.id});
  Object.keys(CIs).forEach(function(id){
    if(ids.indexOf(id)<0){map.removeLayer(CIs[id]);delete CIs[id]}
  });
  list.forEach(function(d){
    if(CIs[d.id])return;
    var html='<div class="ci" style="text-align:center;cursor:pointer">'
      +'<img src="'+d.imageUrl+'" style="width:50px;height:50px;border-radius:10px;border:2.5px solid #FF2D78;object-fit:cover;display:block;margin:0 auto">'
      +'<div style="font-size:9px;font-weight:800;color:#FF2D78;white-space:nowrap;font-family:-apple-system,sans-serif;margin-top:2px">'+d.nickname+'</div>'
      +(d.caption?'<div style="font-size:8px;color:#aaa;font-family:-apple-system,sans-serif;max-width:70px;overflow:hidden;white-space:nowrap">'+d.caption+'</div>':'')
      +'</div>';
    var icon=L.divIcon({html:html,iconSize:[70,70],iconAnchor:[35,65],className:''});
    (function(id_,d_){
      CIs[id_]=L.marker([d_.lat,d_.lng],{icon:icon}).addTo(map)
        .on('click',function(){
          window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'checkin',id:id_,data:d_}));
        });
    })(d.id,d);
  });
}

map.on('contextmenu',function(e){
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'droppin',lat:e.latlng.lat,lng:e.latlng.lng}));
});

function centerOn(lat,lng){map.flyTo([lat,lng],17,{duration:0.8})}
</script>
</body>
</html>`;

export default function MapScreen() {
  const { session }    = useContext(SessionContext);
  const { colors: C }  = useTheme();
  const { userId = '', roomId = '', roomCode = '', nickname = '' } = session ?? {};

  const [members,          setMembers]          = useState({});
  const [myLocation,       setMyLocation]       = useState(null);
  const [sharing,          setSharing]          = useState(true);
  const [trails,           setTrails]           = useState({});
  const [safeZone,         setSafeZone]         = useState(null);
  const [sosVisible,       setSosVisible]       = useState(false);
  const [reactionTarget,   setReactionTarget]   = useState(null);
  const [floatingReactions,setFloatingReactions]= useState([]);
  const sosAlertIds = useRef(new Set());
  const [mapReady,         setMapReady]         = useState(false);
  const [omwBanners,       setOmwBanners]       = useState([]);
  const [pinnedPoint,      setPinnedPoint]      = useState(null);

  // Check-in states
  const [checkIns,         setCheckIns]         = useState([]);
  const [checkInModal,     setCheckInModal]     = useState(false);
  const [checkInCaption,   setCheckInCaption]   = useState('');
  const [checkInImage,     setCheckInImage]     = useState(null);
  const [uploading,        setUploading]        = useState(false);
  const [viewCheckIn,      setViewCheckIn]      = useState(null);

  const webRef        = useRef(null);
  const locationSub   = useRef(null);
  const batteryTimer  = useRef(null);
  const trailBuf      = useRef([]);
  const lastTrailTs   = useRef(0);
  const proxAlerted   = useRef(new Set());
  const prevSharing   = useRef({});
  const isFirstLoad   = useRef(true);
  const omwAlertIds   = useRef(new Set());
  const sharingRef    = useRef(sharing);
  const pendingTimers = useRef([]);
  const pulseAnim     = useRef(new Animated.Value(1)).current;

  const inj = (code) => {
    if (!mapReady || !webRef.current) return;
    if (Platform.OS === 'web') {
      try { webRef.current.contentWindow?.eval(code); } catch {}
    } else {
      webRef.current.injectJavaScript(`(function(){${code}})();true;`);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Keep sharingRef in sync so the GPS callback always reads the latest value
  useEffect(() => { sharingRef.current = sharing; }, [sharing]);

  // Clear all pending timers on unmount to avoid setState-after-unmount
  useEffect(() => () => pendingTimers.current.forEach(clearTimeout), []);

  useEffect(() => { Notifications.requestPermissionsAsync(); }, []);

  // Battery tracking
  useEffect(() => {
    const syncBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        await update(ref(db, `rooms/${roomId}/members/${userId}`), { battery: Math.round(level * 100) });
      } catch {}
    };
    syncBattery();
    batteryTimer.current = setInterval(syncBattery, 300000);
    return () => clearInterval(batteryTimer.current);
  }, []);

  // GPS watch + activity detection
  useEffect(() => {
    let active = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 5 },
        async (loc) => {
          if (!active) return;
          const { latitude: lat, longitude: lng, speed } = loc.coords;
          setMyLocation({ lat, lng });
          const spd = speed ?? -1;
          const activity = spd >= 0 ? (spd > 8.3 ? '🚗' : spd > 0.8 ? '🚶' : '🔴') : null;
          if (sharingRef.current) {
            const payload = { lat, lng, updatedAt: Date.now(), sharing: true };
            if (activity !== null) payload.activity = activity;
            await update(ref(db, `rooms/${roomId}/members/${userId}`), payload);
            const now = Date.now();
            if (now - lastTrailTs.current > 30000) {
              lastTrailTs.current = now;
              trailBuf.current = [...trailBuf.current.slice(-59), { lat, lng, t: now }];
              await set(ref(db, `rooms/${roomId}/trails/${userId}`), trailBuf.current);
            }
          }
          setMembers(cur => {
            Object.entries(cur).forEach(([mid, m]) => {
              if (mid === userId || !m.lat || !m.lng) return;
              const dist = calculateDistance(lat, lng, m.lat, m.lng);
              if (dist <= 200 && !proxAlerted.current.has(mid)) {
                proxAlerted.current.add(mid);
                if (Platform.OS !== 'web') Notifications.scheduleNotificationAsync({
                  content: { title: '💕 Heart Pulse!', body: `${m.nickname} is only ${formatDistance(dist)} away!` },
                  trigger: null,
                });
              } else if (dist > 300) {
                proxAlerted.current.delete(mid);
              }
            });
            return cur;
          });
        }
      );
    })();
    return () => { active = false; locationSub.current?.remove(); };
  }, []);

  // Firebase listeners
  useEffect(() => onValue(ref(db, `rooms/${roomId}/members`), snap => {
    if (!snap.exists()) return;
    const data = snap.val();
    if (!isFirstLoad.current) {
      Object.entries(data).forEach(([mid, m]) => {
        if (mid === userId) return;
        const prev = prevSharing.current[mid];
        if (prev !== undefined && prev !== m.sharing) {
          const msg = m.sharing ? `${m.nickname} is back online! 💕` : `${m.nickname} went offline`;
          if (Platform.OS !== 'web') Notifications.scheduleNotificationAsync({
            content: { title: 'HeartLink', body: msg }, trigger: null,
          });
        }
        prevSharing.current[mid] = m.sharing;
      });
    } else {
      Object.entries(data).forEach(([mid, m]) => { prevSharing.current[mid] = m.sharing; });
      isFirstLoad.current = false;
    }
    setMembers(data);
  }), []);

  useEffect(() => onValue(ref(db, `rooms/${roomId}/trails`), snap => {
    if (snap.exists()) setTrails(snap.val());
  }), []);

  useEffect(() => onValue(ref(db, `rooms/${roomId}/safeZone`), snap => {
    if (snap.exists()) setSafeZone(snap.val());
  }), []);

  useEffect(() => onValue(ref(db, `rooms/${roomId}/reactions`), snap => {
    if (!snap.exists()) return;
    const recent = Object.values(snap.val()).filter(r => r.to === userId && Date.now() - r.timestamp < 5000);
    if (!recent.length) return;
    const last = recent[recent.length - 1];
    const id = Date.now();
    setFloatingReactions(prev => [...prev, { id, emoji: last.type, from: last.fromNickname }]);
    pendingTimers.current.push(setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 3000));
  }), []);

  useEffect(() => onValue(ref(db, `rooms/${roomId}/sos`), snap => {
    if (!snap.exists()) return;
    Object.entries(snap.val()).forEach(([id, sos]) => {
      if (sosAlertIds.current.has(id) || sos.userId === userId) return;
      if (Date.now() - sos.timestamp > 30000) return;
      sosAlertIds.current.add(id);
      if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
      Alert.alert('🆘 SOS!', `${sos.nickname} needs help!`);
      inj(`addSOS(${JSON.stringify(sos)})`);
    });
  }), [mapReady]);

  useEffect(() => onValue(ref(db, `rooms/${roomId}/pings`), snap => {
    if (!snap.exists()) return;
    Object.entries(snap.val()).forEach(([id, ping]) => {
      if (omwAlertIds.current.has(id) || ping.userId === userId) return;
      if (Date.now() - ping.timestamp > 30000) return;
      omwAlertIds.current.add(id);
      if (Platform.OS !== 'web') Notifications.scheduleNotificationAsync({
        content: { title: '🏃 On My Way!', body: `${ping.nickname} is on the way!` }, trigger: null,
      });
      const bid = `${Date.now()}_${Math.random()}`;
      setOmwBanners(prev => [...prev, { id: bid, nickname: ping.nickname }]);
      pendingTimers.current.push(setTimeout(() => setOmwBanners(prev => prev.filter(b => b.id !== bid)), 4000));
    });
  }), []);

  useEffect(() => onValue(ref(db, `rooms/${roomId}/pin`), snap => {
    setPinnedPoint(snap.exists() ? snap.val() : null);
  }), []);

  // Check-ins listener
  useEffect(() => onValue(ref(db, `rooms/${roomId}/checkIns`), snap => {
    if (!snap.exists()) { setCheckIns([]); return; }
    const list = Object.entries(snap.val()).map(([id, d]) => ({ id, ...d }));
    setCheckIns(list);
  }), []);

  // Sync state → map
  useEffect(() => {
    const enriched = {};
    Object.entries(members).forEach(([id, m]) => { enriched[id] = { ...m, emoji: getAvatarEmoji(m.avatar) }; });
    inj(`updateMembers(${JSON.stringify(enriched)},${JSON.stringify(myLocation)})`);
  }, [members, myLocation, mapReady]);

  useEffect(() => {
    const enriched = {};
    Object.entries(members).forEach(([id, m]) => { enriched[id] = { ...m, emoji: getAvatarEmoji(m.avatar) }; });
    inj(`updateTrails(${JSON.stringify(trails)},${JSON.stringify(enriched)})`);
  }, [trails, mapReady]);

  useEffect(() => { inj(`updateSafeZone(${JSON.stringify(safeZone)})`); }, [safeZone, mapReady]);
  useEffect(() => { if (pinnedPoint) inj(`addPin(${JSON.stringify(pinnedPoint)})`); }, [pinnedPoint, mapReady]);
  useEffect(() => { inj(`updateCheckIns(${JSON.stringify(checkIns)})`); }, [checkIns, mapReady]);

  // Actions
  const toggleSharing = async () => {
    const next = !sharing;
    setSharing(next);
    await update(ref(db, `rooms/${roomId}/members/${userId}`), { sharing: next });
  };

  const sendSOS = async () => {
    if (!myLocation) { Alert.alert('', 'Waiting for GPS...'); return; }
    await push(ref(db, `rooms/${roomId}/sos`), { userId, nickname, lat: myLocation.lat, lng: myLocation.lng, timestamp: Date.now() });
    if (Platform.OS !== 'web') Vibration.vibrate(500);
    Alert.alert('🆘 SOS Sent!', 'Everyone in your group has been notified!');
    setSosVisible(false);
  };

  const sendReaction = async (toId, emoji) => {
    await push(ref(db, `rooms/${roomId}/reactions`), { from: userId, to: toId, fromNickname: nickname, type: emoji, timestamp: Date.now() });
    setReactionTarget(null);
  };

  const sendOMW = async () => {
    await push(ref(db, `rooms/${roomId}/pings`), { userId, nickname, type: 'omw', timestamp: Date.now() });
    Alert.alert('🏃 On My Way!', "Everyone knows you're on the way!");
  };

  const dropPinAtMyLocation = async () => {
    if (!myLocation) { Alert.alert('', 'Waiting for GPS...'); return; }
    await set(ref(db, `rooms/${roomId}/pin`), { lat: myLocation.lat, lng: myLocation.lng, nickname, userId, timestamp: Date.now() });
  };

  const openCheckIn = async () => {
    if (!myLocation) { Alert.alert('', 'Waiting for GPS...'); return; }
    if (CLOUD_NAME === 'YOUR_CLOUD_NAME') {
      Alert.alert('Setup required', 'Set CLOUD_NAME and UPLOAD_PRESET in MapScreen.js');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('', 'Camera permission required'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled) {
      setCheckInImage(result.assets[0].base64);
      setCheckInCaption('');
      setCheckInModal(true);
    }
  };

  const submitCheckIn = async () => {
    if (!checkInImage || !myLocation) return;
    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(checkInImage); // base64 string
      await push(ref(db, `rooms/${roomId}/checkIns`), {
        lat: myLocation.lat, lng: myLocation.lng,
        imageUrl, nickname, userId,
        caption: checkInCaption.trim(),
        timestamp: Date.now(),
      });
      setCheckInModal(false);
      setCheckInImage(null);
      Alert.alert('📸', 'Check-in posted! 💕');
    } catch {
      Alert.alert('Error', 'Upload failed, please try again');
    }
    setUploading(false);
  };

  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent?.data ?? e.data);
      if (data.type === 'tap' && data.uid !== userId) setReactionTarget(data.uid);
      if (data.type === 'droppin') {
        set(ref(db, `rooms/${roomId}/pin`), { lat: data.lat, lng: data.lng, nickname, userId, timestamp: Date.now() });
      }
      if (data.type === 'checkin') setViewCheckIn(data.data);
    } catch {}
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => {
      if (e.source !== webRef.current?.contentWindow) return;
      onMessage(e);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [userId]);

  const memberList = Object.entries(members).map(([id, m]) => ({
    id, ...m, emoji: getAvatarEmoji(m.avatar),
    distance: myLocation && m.lat && m.lng ? calculateDistance(myLocation.lat, myLocation.lng, m.lat, m.lng) : null,
  }));

  return (
    <View style={s.root}>
      {Platform.OS === 'web' ? (
        <iframe ref={webRef} srcDoc={MAP_HTML} style={{ flex: 1, border: 'none', width: '100%', height: '100%' }} onLoad={() => setMapReady(true)} title="map" />
      ) : (
        <WebView
          ref={webRef}
          style={s.map}
          source={{ html: MAP_HTML }}
          javaScriptEnabled domStorageEnabled originWhitelist={['*']}
          mixedContentMode="always"
          onLoad={() => setMapReady(true)}
          onMessage={onMessage}
          scrollEnabled={false}
        />
      )}

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.roomChip}>
          <Text style={s.roomLabel}>ROOM</Text>
          <Text style={s.roomCode}>{roomCode}</Text>
        </View>
        <TouchableOpacity style={[s.ghostChip, !sharing && s.ghostActive]} onPress={toggleSharing}>
          <Text style={s.ghostText}>{sharing ? '👁  LIVE' : '👻  GHOST'}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={s.quickBar}>
        <TouchableOpacity style={s.quickBtn} onPress={sendOMW}>
          <Text style={s.quickBtnText}>🏃  ON MY WAY</Text>
        </TouchableOpacity>
        <View style={s.quickDiv} />
        <TouchableOpacity style={s.quickBtn} onPress={dropPinAtMyLocation}>
          <Text style={s.quickBtnText}>📍  DROP PIN</Text>
        </TouchableOpacity>
        <View style={s.quickDiv} />
        <TouchableOpacity style={s.quickBtn} onPress={openCheckIn}>
          <Text style={s.quickBtnText}>📸  CHECK-IN</Text>
        </TouchableOpacity>
      </View>

      {/* OMW banners */}
      {omwBanners.map(b => (
        <View key={b.id} style={s.omwWrap}>
          <View style={s.omwBanner}>
            <Text style={s.omwText}>🏃  {b.nickname} is on the way!</Text>
          </View>
        </View>
      ))}

      {/* Floating reactions */}
      {floatingReactions.map(r => (
        <View key={r.id} style={s.floatBox}>
          <Text style={s.floatEmoji}>{r.emoji}</Text>
          <Text style={s.floatFrom}>{r.from}</Text>
        </View>
      ))}

      {/* Member strip */}
      <View style={s.strip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stripInner}>
          {memberList.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.mCard, { borderColor: (m.color || '#FF2D78') + '44' }]}
              onPress={() => m.lat && m.lng && inj(`centerOn(${m.lat},${m.lng})`)}
              onLongPress={() => m.id !== userId && setReactionTarget(m.id)}
              activeOpacity={0.75}
            >
              <View style={[s.mRing, { borderColor: m.sharing ? (m.color || '#FF2D78') : '#222' }]}>
                <Text style={s.mEmoji}>{m.emoji}</Text>
              </View>
              <Text style={[s.mName, { color: m.color || '#FF2D78' }]} numberOfLines={1}>{m.nickname}</Text>
              {m.distance !== null && (
                <Text style={s.mDist}>{formatDistance(m.distance)}{m.activity ? `  ${m.activity}` : ''}</Text>
              )}
              {m.battery != null && (
                <Text style={[s.mBattery, m.battery <= 20 && s.mBatteryLow]}>
                  {m.battery <= 20 ? '🪫' : '🔋'} {m.battery}%
                </Text>
              )}
              {m.mood && <Text style={s.mMood}>{m.mood}</Text>}
              {!m.sharing && <Text style={s.ghostTag}>👻</Text>}
              {m.id === userId && <Text style={s.meTag}>ME</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* SOS FAB */}
      <Animated.View style={[s.sosWrap, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity onPress={() => setSosVisible(true)} activeOpacity={0.85}>
          <LinearGradient colors={['#FF3B30', '#660000']} style={s.sosFab}>
            <Text style={s.sosFabText}>SOS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Locate me */}
      <TouchableOpacity style={s.locateBtn} onPress={() => myLocation && inj(`centerOn(${myLocation.lat},${myLocation.lng})`)}>
        <Ionicons name="navigate" size={20} color="#FF2D78" />
      </TouchableOpacity>

      {/* SOS Modal */}
      <Modal visible={sosVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.sosModal}>
            <Text style={s.sosTitle}>🆘  SEND SOS?</Text>
            <Text style={s.sosDesc}>Alert everyone in your group that you need help</Text>
            <TouchableOpacity onPress={sendSOS} activeOpacity={0.85}>
              <LinearGradient colors={['#FF3B30', '#660000']} style={s.sosConfirm}>
                <Text style={s.sosConfirmText}>SEND SOS  🆘</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSosVisible(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reaction picker */}
      <Modal visible={!!reactionTarget} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setReactionTarget(null)}>
          <View style={s.reactionPanel}>
            <Text style={s.reactionTitle}>
              SEND VIBE{members[reactionTarget]?.nickname ? ` TO ${members[reactionTarget].nickname}` : ''}  ✨
            </Text>
            <View style={s.reactionRow}>
              {REACTIONS.map(r => (
                <TouchableOpacity key={r} style={s.reactionBtn} onPress={() => sendReaction(reactionTarget, r)}>
                  <Text style={s.reactionEmoji}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Check-In Modal */}
      <Modal visible={checkInModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.checkInPanel}>
            <Text style={s.checkInTitle}>📸  CHECK-IN</Text>
            {checkInImage && (
              <View style={s.previewBox}>
                <Text style={{ fontSize: 40 }}>🖼</Text>
                <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>Photo ready</Text>
              </View>
            )}
            <TextInput
              style={s.captionInput}
              placeholder="caption... (optional)"
              placeholderTextColor="#444"
              value={checkInCaption}
              onChangeText={setCheckInCaption}
              maxLength={60}
            />
            <TouchableOpacity onPress={submitCheckIn} disabled={uploading} activeOpacity={0.85}>
              <LinearGradient colors={['#FF2D78', '#8B0040']} style={s.checkInBtn}>
                {uploading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.checkInBtnText}>POST TO MAP  📸</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCheckInModal(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: '#444', letterSpacing: 2, fontSize: 12 }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* View Check-In Modal */}
      <Modal visible={!!viewCheckIn} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setViewCheckIn(null)}>
          <View style={s.viewCIPanel}>
            <Text style={s.checkInTitle}>📸 {viewCheckIn?.nickname}</Text>
            {viewCheckIn?.caption ? <Text style={{ color: '#999', marginBottom: 12 }}>{viewCheckIn.caption}</Text> : null}
            <View style={{ width: 220, height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
              {!!viewCheckIn?.imageUrl && (
                <WebView source={{ uri: viewCheckIn.imageUrl }} style={{ width: 220, height: 220 }} scrollEnabled={false} />
              )}
            </View>
            <Text style={{ color: '#444', fontSize: 10, marginTop: 12 }}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  map:  { flex: 1 },

  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.5)',
  },
  roomLabel: { color: '#FF2D78', fontSize: 9, letterSpacing: 2.5, fontWeight: '800' },
  roomCode:  { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 4 },
  ghostChip: {
    backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.3)',
  },
  ghostActive: { borderColor: '#333' },
  ghostText: { color: '#FF2D78', fontWeight: '700', fontSize: 11, letterSpacing: 1 },

  quickBar: {
    position: 'absolute', top: 110, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,45,120,0.3)',
    overflow: 'hidden',
  },
  quickBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center' },
  quickBtnText: { color: '#FF2D78', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  quickDiv:     { width: 1, height: 22, backgroundColor: 'rgba(255,45,120,0.25)' },

  omwWrap:   { position: 'absolute', top: 158, left: 0, right: 0, alignItems: 'center' },
  omwBanner: { backgroundColor: 'rgba(8,0,4,0.93)', borderWidth: 1, borderColor: 'rgba(255,45,120,0.55)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  omwText:   { color: '#FF2D78', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  floatBox:   { position: 'absolute', top: '38%', alignSelf: 'center', alignItems: 'center' },
  floatEmoji: { fontSize: 60 },
  floatFrom:  { color: '#FF2D78', fontSize: 11, fontWeight: '800', marginTop: 8 },

  strip:      { position: 'absolute', bottom: 16, left: 0, right: 0 },
  stripInner: { paddingHorizontal: 12, gap: 10 },
  mCard: {
    backgroundColor: 'rgba(0,0,0,0.88)', borderRadius: 16, borderWidth: 1,
    padding: 10, alignItems: 'center', minWidth: 72,
  },
  mRing:       { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mEmoji:      { fontSize: 22 },
  mName:       { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  mDist:       { color: '#555', fontSize: 9, marginTop: 2 },
  mBattery:    { fontSize: 9, color: '#555', marginTop: 1 },
  mBatteryLow: { color: '#FF3B30' },
  mMood:       { fontSize: 12, marginTop: 3 },
  ghostTag:    { fontSize: 12, marginTop: 3 },
  meTag:       { color: '#FF2D78', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

  sosWrap: { position: 'absolute', bottom: 120, right: 16 },
  sosFab:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  sosFabText: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 1 },

  locateBtn: {
    position: 'absolute', bottom: 186, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.88)', borderWidth: 1, borderColor: 'rgba(255,45,120,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  sosModal: { backgroundColor: '#080808', borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.4)', padding: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sosTitle: { color: '#FF3B30', fontSize: 20, fontWeight: '900', letterSpacing: 3, textAlign: 'center', marginBottom: 10 },
  sosDesc:  { color: '#555', fontSize: 13, textAlign: 'center', marginBottom: 22 },
  sosConfirm: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  sosConfirmText: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 2 },
  cancelBtn:  { marginTop: 16, alignItems: 'center' },
  cancelText: { color: '#444', fontSize: 12, letterSpacing: 3 },

  reactionPanel: {
    backgroundColor: '#080808', borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.4)',
    padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  reactionTitle: { color: '#FF2D78', fontSize: 12, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  reactionRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  reactionBtn:   { padding: 10 },
  reactionEmoji: { fontSize: 36 },

  checkInPanel: {
    backgroundColor: '#080808', borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.4)',
    padding: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  checkInTitle: { color: '#FF2D78', fontSize: 17, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 16 },
  previewBox:   { alignItems: 'center', marginBottom: 14 },
  captionInput: {
    backgroundColor: '#111', borderRadius: 10, padding: 14, color: '#E8E8E8',
    borderWidth: 1, borderColor: 'rgba(255,45,120,0.3)', fontSize: 14, marginBottom: 16,
  },
  checkInBtn:     { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  checkInBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 2 },

  viewCIPanel: {
    backgroundColor: '#080808', borderTopWidth: 1, borderTopColor: 'rgba(255,45,120,0.4)',
    padding: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, alignItems: 'center',
  },
});
