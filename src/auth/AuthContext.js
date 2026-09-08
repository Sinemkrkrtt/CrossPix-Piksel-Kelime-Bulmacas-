// src/auth/AuthContext.js
// Firebase Authentication sarmalayıcısı. Tüm ekranlar oturumu buradan okur.
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

const AuthContext = createContext(null);

// Firebase hata kodlarını Türkçe, kullanıcı dostu mesajlara çevir.
const trMessage = (code) =>
  ({
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/missing-password': 'Şifre gir.',
    'auth/missing-email': 'E-posta gir.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/user-not-found': 'Kullanıcı bulunamadı.',
    'auth/wrong-password': 'Şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme. Biraz sonra tekrar dene.',
    'auth/network-request-failed': 'İnternet bağlantısı yok.',
    'auth/requires-recent-login': 'Güvenlik için yeniden giriş yapman gerekiyor.',
    'auth/operation-not-allowed': 'E-posta/şifre girişi kapalı. Firebase Console → Authentication → Email/Password’ü aç.',
    'auth/configuration-not-found': 'E-posta/şifre girişi kapalı. Firebase Console → Authentication → Email/Password’ü aç.',
    'auth/admin-restricted-operation': 'Bu işleme izin verilmiyor. Firebase ayarlarını kontrol et.',
  }[code] || 'Bir hata oluştu, tekrar dene.');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); }), []);

  const register = async (email, password, name) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, (email || '').trim(), password);
      if (name && name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: trMessage(e.code) };
    }
  };

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, (email || '').trim(), password);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: trMessage(e.code) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: trMessage(e.code) };
    }
  };

  // Hesabı kalıcı olarak siler. Oturum eskiyse Firebase yeniden giriş ister.
  const removeAccount = async () => {
    try {
      if (auth.currentUser) await deleteUser(auth.currentUser);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: trMessage(e.code), code: e.code };
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, register, login, logout, removeAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
