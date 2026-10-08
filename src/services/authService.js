import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase.js";

export async function getUser(user) { return user; }
export async function updateUser(_currentUser, user) { return user; }
export async function clearDemoData() { return { user: null, pets: [], bookings: [], cart: [], reports: [], calendarEvents: [], notifications: [], adoptionListings: [], favorites: [], recentlyViewed: [], orders: [], storeSort: "featured" }; }

export function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function updateAuthDisplayName(user, displayName) {
  return updateProfile(user, { displayName });
}

export async function loginWithEmail(email, password, remember = true) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}

export function getCurrentAuthUser() {
  return auth.currentUser;
}

export function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}