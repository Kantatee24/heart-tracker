import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUserId } from '../utils/helpers';

const AuthContext = createContext(undefined);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(undefined); // undefined = loading

  useEffect(() => {
    AsyncStorage.getItem('hl_uid').then(id => {
      if (id) { setUserId(id); return; }
      const newId = generateUserId();
      AsyncStorage.setItem('hl_uid', newId);
      setUserId(newId);
    });
  }, []);

  return <AuthContext.Provider value={userId}>{children}</AuthContext.Provider>;
}
