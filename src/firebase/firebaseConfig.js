// src/firebase/firebaseConfig.js
// Firebase başlatma — sadece Authentication. (Analytics React Native'de
// desteklenmez, o yüzden getAnalytics KULLANILMAZ.)
// Not: apiKey Firebase web yapılandırmasında gizli değildir; projeyi tanımlar,
// güvenlik Firebase kuralları/izinleriyle sağlanır.
import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBfDnLcU1WZ-rTbsS_3wciaomBVziBoEkc',
  authDomain: 'pixel-diorama-5bb5a.firebaseapp.com',
  projectId: 'pixel-diorama-5bb5a',
  storageBucket: 'pixel-diorama-5bb5a.firebasestorage.app',
  messagingSenderId: '784945906056',
  appId: '1:784945906056:web:737bd04f37065de2e73a3d',
  measurementId: 'G-PQLBRBZ8QZ',
};

const app = initializeApp(firebaseConfig);

// Oturumu yeniden açılışlar arasında saklamak için AsyncStorage kalıcılığı.
// initializeAuth yalnızca bir kez çağrılabilir; Fast Refresh'te tekrar
// çağrılırsa mevcut örneği döndür.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;

// Firestore (kullanıcı verisi — ücretsiz Spark planında çalışır).
// React Native'de WebChannel sorunlarını önlemek için long-polling zorunlu.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });

export default app;
