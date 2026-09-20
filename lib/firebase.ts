// File: lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyA1wfsqVdZbCl4ZhwANB9m3RYoH9VmmZXQ",
  authDomain: "finance-7431a.firebaseapp.com",
  projectId: "finance-7431a",
  storageBucket: "finance-7431a.firebasestorage.app",
  messagingSenderId: "983706703266",
  appId: "1:983706703266:web:bdb9c29d471d8a13294efb",
  measurementId: "G-S6JMR020C1"
};

// Prevent multiple initializations during hot-reloads
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app) // <-- EXPORT FIRESTORE INSTANCE