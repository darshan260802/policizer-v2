"use client"

import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyBKtJ0gBfQ4ubQ6M9t5eDBqYuA240yQZMU",
  authDomain: "policyzer.firebaseapp.com",
  projectId: "policyzer",
  storageBucket: "policyzer.firebasestorage.app",
  messagingSenderId: "17590580060",
  appId: "1:17590580060:web:d486c61447bba5676c0799",
  measurementId: "G-CG8QRKD46X",
}

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

const auth = getAuth(firebaseApp)
const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({
  prompt: "select_account",
})

export { auth, googleProvider }
