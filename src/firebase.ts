import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultFirebaseConfigJson from '../firebase-applet-config.json';
import backupFirebaseConfigJson from '../firebase-backup-config.json';

const selectedServer = localStorage.getItem('selected_firebase_server') || 'default';

let config;
if (selectedServer === 'backup') {
  // Simple validation to ensure backup config isn't entirely empty
  if (backupFirebaseConfigJson.apiKey) {
    config = backupFirebaseConfigJson;
  } else {
    config = defaultFirebaseConfigJson; // Fallback if backup isn't setup
  }
} else {
  config = defaultFirebaseConfigJson;
}

const app = initializeApp(config);
export const db = getFirestore(app, (config as any).firestoreDatabaseId);
export const auth = getAuth(app);
