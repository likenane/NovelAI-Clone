import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { NovelSettings } from '../types';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [openRouterKey, setOpenRouterKey] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });

    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection error: check configuration.");
        }
      }
    }
    testConnection();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserSettings(null);
      setOpenRouterKey('');
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const settings = data.settings || {};
        setUserSettings(settings);
        if (settings.openRouterKey) {
          setOpenRouterKey(settings.openRouterKey);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  return {
    user,
    isAuthReady,
    userSettings,
    openRouterKey,
    setOpenRouterKey
  };
}
