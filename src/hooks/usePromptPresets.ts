import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PromptPreset, OperationType } from '../types';
import { handleFirestoreError, getFriendlyErrorMessage } from '../lib/utils';
import { useNotification } from '../components/NotificationSystem';

export function usePromptPresets(user: any) {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (!user) {
      setPresets([]);
      setIsLoading(false);
      return;
    }

    const presetsRef = collection(db, 'users', user.uid, 'promptPresets');
    const q = query(presetsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPresets: PromptPreset[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as PromptPreset));
      setPresets(loadedPresets);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching presets:", error);
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      setIsLoading(false);
      try { handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/promptPresets`); } catch(e) {}
    });

    return () => unsubscribe();
  }, [user]);

  const savePreset = async (name: string, prompts: PromptPreset['prompts']) => {
    if (!user) return false;
    if (!name.trim()) {
      addNotification({ message: "Preset name cannot be empty.", type: 'error' });
      return false;
    }

    // Check for duplicate name
    if (presets.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      addNotification({ message: "A preset with this name already exists.", type: 'error' });
      return false;
    }

    const newId = crypto.randomUUID();
    const newPreset: PromptPreset = {
      id: newId,
      name: name.trim(),
      prompts,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'promptPresets', newId), newPreset);
      addNotification({ message: `Preset "${name}" saved successfully!`, type: 'success' });
      return true;
    } catch (error) {
      console.error("Error saving preset:", error);
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      try { handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/promptPresets/${newId}`); } catch(e) {}
      return false;
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!user) return false;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'promptPresets', presetId));
      addNotification({ message: "Preset deleted.", type: 'success' });
      return true;
    } catch (error) {
      console.error("Error deleting preset:", error);
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      try { handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/promptPresets/${presetId}`); } catch(e) {}
      return false;
    }
  };

  return {
    presets,
    isLoading,
    savePreset,
    deletePreset
  };
}
