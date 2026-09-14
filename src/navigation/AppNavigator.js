import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../firebase';

import WelcomeScreen  from '../screens/WelcomeScreen';
import MapScreen      from '../screens/MapScreen';
import ChatScreen     from '../screens/ChatScreen';
import ProfileScreen  from '../screens/ProfileScreen';
import { SessionContext } from '../context/SessionContext';
import { useTheme }       from '../context/ThemeContext';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const { colors: C } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.navBg,
          borderTopColor:  C.navBorder,
          borderTopWidth:  1,
          height: 62, paddingBottom: 8, paddingTop: 4,
        },
        tabBarActiveTintColor:   '#FF2D78',
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
      }}
    >
      <Tab.Screen name="Map" component={MapScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'location' : 'location-outline'} color={color} size={size} />
          ),
          tabBarLabel: 'MAP',
        }}
      />
      <Tab.Screen name="Chat" component={ChatScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} color={color} size={size} />
          ),
          tabBarLabel: 'CHAT',
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
          ),
          tabBarLabel: 'PROFILE',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState(null);
  const { colors: C } = useTheme();

  useEffect(() => {
    if (!session?.roomId) return;
    return onValue(ref(db, `rooms/${session.roomId}/info`), snap => {
      if (!snap.exists()) {
        Alert.alert('💔', 'The relationship has ended...', [{ text: 'OK' }]);
        setSession(null);
      }
    });
  }, [session?.roomId]);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        ) : (
          <Stack.Screen name="Main"    component={MainTabs} />
        )}
      </Stack.Navigator>
    </SessionContext.Provider>
  );
}
