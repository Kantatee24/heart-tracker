import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCXQ7iZanoNSVxLAsz5Ry9QDMhOf0CBviM",
  authDomain: "heart-tracker-e437c.firebaseapp.com",
  databaseURL: "https://heart-tracker-e437c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "heart-tracker-e437c",
  storageBucket: "heart-tracker-e437c.firebasestorage.app",
  messagingSenderId: "1045874927605",
  appId: "1:1045874927605:web:b25f6cbcb4e8f89918a2bc",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
