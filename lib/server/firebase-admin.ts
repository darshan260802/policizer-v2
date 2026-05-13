import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

function getPrivateKey() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!privateKey) {
    throw new Error("FIREBASE_PRIVATE_KEY is required for cron reminder delivery.")
  }

  return privateKey.replace(/\\n/g, "\n")
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

  if (!projectId || !clientEmail) {
    throw new Error(
      "FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL are required for cron reminder delivery."
    )
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: getPrivateKey(),
    }),
  })
}

function getAdminDb() {
  return getFirestore(getFirebaseAdminApp())
}

export { getAdminDb }
