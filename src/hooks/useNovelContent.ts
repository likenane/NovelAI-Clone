import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs,
  writeBatch,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { Novel, LoreEntry, MemoryArchiveCard, MemoryArchiveEntryDraft, OperationType } from '../types';
import { handleFirestoreError, getFriendlyErrorMessage } from '../lib/utils';
import { sanitizeAndHealLoreEntries } from '../lib/loreUtils';

export function useNovelContent(
  user: FirebaseUser | null, 
  novels: Novel[],
  addNotification: (n: any) => string,
  removeNotification: (id: string) => void,
  updateNotification: (id: string, updates: any) => void,
  setShowSavedIndicator: (show: boolean) => void,
  getEditorContent?: () => string
) {
  const [currentNovel, setCurrentNovel] = useState<Novel | null>(null);
  const lastSavedNovelRef = useRef<Novel | null>(null);
  const lastContentRef = useRef<string>("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveNotifyId = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  const currentNovelRef = useRef<Novel | null>(null);
  
  // Listen for global Quota error to unblock hanging UI states
  useEffect(() => {
    const handleQuotaError = () => {
      setIsSaving(false);
      setHasError(true);
      setShowSavedIndicator(false); // Make sure visual checkmark isn't stuck 
      if (saveNotifyId.current) {
        removeNotification(saveNotifyId.current);
        saveNotifyId.current = null;
      }
    };
    window.addEventListener('firestore-quota-error', handleQuotaError);
    return () => window.removeEventListener('firestore-quota-error', handleQuotaError);
  }, [removeNotification, setShowSavedIndicator]);

  // Sync currentNovel with the one from the list if it changes (e.g. title update)
  useEffect(() => {
    currentNovelRef.current = currentNovel;
  }, [currentNovel]);

  useEffect(() => {
    setCurrentNovel(prev => {
      if (!prev) return null;
      const found = novels.find(n => n.id === prev.id);
      if (found) {
        // Protect local edits if novel is currently active
        const localPlot = prev.plot !== undefined ? prev.plot : (found.plot || "");
        const localStoryMemory = prev.storyMemory !== undefined ? prev.storyMemory : (found.storyMemory || "");

        // Check if metadata actually changed to avoid unnecessary state updates
        if (
          found.title !== prev.title ||
          JSON.stringify(found.settings) !== JSON.stringify(prev.settings) ||
          (found.storyMemory !== undefined && found.storyMemory !== prev.storyMemory && found.storyMemory !== localStoryMemory) ||
          (found.plot !== undefined && (found.plot || "") !== (prev.plot || "") && (found.plot || "") !== localPlot) ||
          found.type !== prev.type ||
          found.parentId !== prev.parentId ||
          found.order !== prev.order
        ) {
          return { 
            ...found, 
            content: prev.content, 
            loreEntries: prev.loreEntries,
            storyMemory: localStoryMemory,
            plot: localPlot
          };
        }
        return prev;
      }
      return null; // Novel was deleted
    });
  }, [novels]);

  // Content and Lore Sync
  useEffect(() => {
    if (user && currentNovel?.id) {
      setHasError(false);
      const requestedId = currentNovel.id;

      // 1. Fetch Content (One-time or real-time? App.tsx uses getDoc then onSnapshot for lore)
      const fetchContent = async () => {
        try {
          const contentSnap = await getDoc(doc(db, 'novels', requestedId, 'contents', 'main'));
          const finalContent = contentSnap.exists() ? contentSnap.data().content : "";
          
          if (currentNovelRef.current?.id === requestedId) {
            setCurrentNovel(prev => prev?.id === requestedId ? { ...prev, content: finalContent } : prev);
            lastContentRef.current = finalContent;
            if (lastSavedNovelRef.current?.id === requestedId) {
              lastSavedNovelRef.current.content = finalContent;
            }
          }
        } catch (error) {
          console.error("Error fetching content:", error);
          if (currentNovelRef.current?.id === requestedId) {
            setHasError(true);
          }
        }
      };

      // 2. Isolated one-time legacy migration check for novels created before subcollections
      const checkAndMigrateLegacyLore = async () => {
        try {
          // Check if parent novel document in Firestore contains legacy loreEntries
          let legacyLore = (novels.find(n => n.id === requestedId) as any)?.loreEntries;
          if (!legacyLore) {
            const rootSnap = await getDoc(doc(db, 'novels', requestedId));
            if (rootSnap.exists()) {
              legacyLore = rootSnap.data()?.loreEntries;
            }
          }

          if (Array.isArray(legacyLore) && legacyLore.length > 0) {
            const subDocs = await getDocs(collection(db, 'novels', requestedId, 'loreEntries'));
            if (subDocs.empty) {
              const batch = writeBatch(db);
              legacyLore.forEach((entry: LoreEntry) => {
                const entryRef = doc(db, 'novels', requestedId, 'loreEntries', entry.id);
                batch.set(entryRef, {
                  ...entry,
                  updatedAt: serverTimestamp()
                });
              });
              batch.update(doc(db, 'novels', requestedId), {
                loreEntries: deleteField()
              });
              await batch.commit();
            } else {
              await updateDoc(doc(db, 'novels', requestedId), {
                loreEntries: deleteField()
              });
            }
          }
        } catch (error) {
          console.error("Legacy lore migration check error:", error);
        }
      };

      // 3. Fetch Lore Entries (Real-time)
      const loreQuery = query(collection(db, 'novels', requestedId, 'loreEntries'));
      const unsubscribeLore = onSnapshot(loreQuery, async (snapshot) => {
        if (currentNovelRef.current?.id !== requestedId) return;

        const rawEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LoreEntry))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Auto-healing for corrupted, orphaned, or circular parent references
        const { healed, repairedIds } = sanitizeAndHealLoreEntries(rawEntries);

        if (currentNovelRef.current?.id === requestedId) {
          setCurrentNovel(prev => {
            if (prev?.id === requestedId) {
              return { ...prev, loreEntries: healed };
            }
            return prev;
          });
          
          if (lastSavedNovelRef.current?.id === requestedId) {
            lastSavedNovelRef.current.loreEntries = healed;
          }
        }

        // If corrupted/circular entries were detected, auto-persist the healed state to Firestore
        if (repairedIds.length > 0) {
          console.warn(`[Codex Self-Healing] Automatically healed ${repairedIds.length} broken/circular lore entries:`, repairedIds);
          try {
            const healBatch = writeBatch(db);
            for (const id of repairedIds) {
              const entry = healed.find(e => e.id === id);
              if (entry) {
                healBatch.update(doc(db, 'novels', requestedId, 'loreEntries', id), {
                  parentId: entry.parentId || null,
                  order: entry.order,
                  updatedAt: serverTimestamp()
                });
              }
            }
            await healBatch.commit();
            addNotification({
              message: `계층 구조가 손상되었던 코덱스 항목(${repairedIds.length}개)이 최상위로 안전하게 복구되었습니다.`,
              type: 'info'
            });
          } catch (healErr) {
            console.error("[Codex Self-Healing] Failed to commit healed lore entries:", healErr);
          }
        }
      }, (error) => {
        // Suppress benign permission/not-found errors on empty initial subcollections
        if (!error.message?.includes('Missing or insufficient permissions')) {
          console.error("Error fetching lore entries:", error);
        }
        if (currentNovelRef.current?.id === requestedId) {
          setCurrentNovel(prev => prev?.id === requestedId ? { ...prev, loreEntries: [] } : prev);
        }
      });

      // 4. Fetch Memory Cards (Real-time)
      const cardsQuery = query(collection(db, 'novels', requestedId, 'memoryCards'));
      const unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
        if (currentNovelRef.current?.id !== requestedId) return;

        const cards = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MemoryArchiveCard))
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (currentNovelRef.current?.id === requestedId) {
          setCurrentNovel(prev => {
            if (prev?.id === requestedId) {
              return { ...prev, memoryCards: cards };
            }
            return prev;
          });

          if (lastSavedNovelRef.current?.id === requestedId) {
            lastSavedNovelRef.current.memoryCards = cards;
          }
        }
      }, (error) => {
        // Suppress benign permission/not-found errors on empty initial subcollections
        if (!error.message?.includes('Missing or insufficient permissions')) {
          console.error("Error fetching memory cards:", error);
        }
        if (currentNovelRef.current?.id === requestedId) {
          setCurrentNovel(prev => prev?.id === requestedId ? { ...prev, memoryCards: [] } : prev);
        }
      });

      fetchContent();
      checkAndMigrateLegacyLore();
      lastSavedNovelRef.current = JSON.parse(JSON.stringify(currentNovel));
      
      return () => {
        unsubscribeLore();
        unsubscribeCards();
      };
    }
  }, [currentNovel?.id, user?.uid]);

  const updateLoreEntry = async (id: string, updates: Partial<LoreEntry>) => {
    if (!currentNovel || !user) return;
    
    setCurrentNovel(prev => {
      if (prev?.id === currentNovel.id) {
        const updatedEntries = (prev.loreEntries || []).map(entry => 
          entry.id === id ? { ...entry, ...updates } : entry
        );
        return { ...prev, loreEntries: updatedEntries };
      }
      return prev;
    });

    try {
      await updateDoc(doc(db, 'novels', currentNovel.id, 'loreEntries', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.UPDATE, `novels/${currentNovel.id}/loreEntries/${id}`);
    }
  };

  const addLoreEntry = async (type: 'item' | 'folder' = 'item', parentId: string | null = null, initialData?: Partial<LoreEntry>) => {
    if (!currentNovel || !user) return;
    const entries = currentNovel.loreEntries || [];
    const maxOrder = entries.length > 0 ? Math.max(...entries.map(e => e.order)) : 0;
    
    const entryId = Math.random().toString(36).substr(2, 9);
    const newEntry: LoreEntry = {
      id: entryId,
      title: type === 'item' ? "New Entry" : "New Folder",
      content: "",
      keywords: "",
      isAlwaysActive: false,
      enabled: true,
      type,
      parentId,
      order: maxOrder + 1,
      ...initialData
    };

    try {
      await setDoc(doc(db, 'novels', currentNovel.id, 'loreEntries', entryId), {
        ...newEntry,
        updatedAt: serverTimestamp()
      });
      return entryId;
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.CREATE, `novels/${currentNovel.id}/loreEntries`);
    }
  };

  const deleteLoreEntry = async (id: string) => {
    if (!currentNovel || !user) return;

    // Optimistic UI update for immediate responsiveness
    setCurrentNovel(prev => {
      if (prev?.id === currentNovel.id) {
        return {
          ...prev,
          loreEntries: (prev.loreEntries || []).filter(e => e.id !== id)
        };
      }
      return prev;
    });

    try {
      await deleteDoc(doc(db, 'novels', currentNovel.id, 'loreEntries', id));
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.DELETE, `novels/${currentNovel.id}/loreEntries/${id}`);
    }
  };

  const moveLoreEntryToRoot = async (id: string) => {
    if (!currentNovel || !user) return;
    const entries = currentNovel.loreEntries || [];
    const rootEntries = entries.filter(e => !e.parentId);
    const maxOrder = rootEntries.length > 0 ? Math.max(...rootEntries.map(e => e.order || 0)) : 0;

    // Optimistic UI update
    setCurrentNovel(prev => {
      if (prev?.id === currentNovel.id) {
        return {
          ...prev,
          loreEntries: (prev.loreEntries || []).map(e => 
            e.id === id ? { ...e, parentId: null, order: maxOrder + 1 } : e
          )
        };
      }
      return prev;
    });

    try {
      await updateDoc(doc(db, 'novels', currentNovel.id, 'loreEntries', id), {
        parentId: null,
        order: maxOrder + 1,
        updatedAt: serverTimestamp()
      });
      const target = entries.find(e => e.id === id);
      addNotification({ message: `"${target?.title || '항목'}"을(를) 최상위로 꺼냈습니다.`, type: 'success' });
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.UPDATE, `novels/${currentNovel.id}/loreEntries/${id}`);
    }
  };

  const healLoreHierarchy = async () => {
    if (!currentNovel || !user) return;
    const entries = currentNovel.loreEntries || [];
    if (entries.length === 0) return;

    // 1. Run sanitizeAndHealLoreEntries to resolve cycles and missing parents
    const { healed } = sanitizeAndHealLoreEntries(entries);

    // 2. Cleanly group and re-index sibling orders for all parent levels
    const parentBuckets = new Map<string | null, LoreEntry[]>();
    for (const e of healed) {
      const pid = e.parentId || null;
      if (!parentBuckets.has(pid)) {
        parentBuckets.set(pid, []);
      }
      parentBuckets.get(pid)!.push(e);
    }

    const fullyOrganized: LoreEntry[] = [];
    for (const [_, bucket] of parentBuckets.entries()) {
      bucket.sort((a, b) => (a.order || 0) - (b.order || 0));
      bucket.forEach((item, idx) => {
        fullyOrganized.push({
          ...item,
          order: idx * 10
        });
      });
    }

    // Optimistic UI update
    setCurrentNovel(prev => {
      if (prev?.id === currentNovel.id) {
        return { ...prev, loreEntries: fullyOrganized };
      }
      return prev;
    });

    try {
      const batch = writeBatch(db);
      for (const entry of fullyOrganized) {
        batch.update(doc(db, 'novels', currentNovel.id, 'loreEntries', entry.id), {
          parentId: entry.parentId || null,
          order: entry.order,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      addNotification({
        message: '코덱스 계층 구조 및 순서가 깨끗하게 복구 및 정렬되었습니다.',
        type: 'success'
      });
    } catch (error) {
      console.error("Failed to heal lore hierarchy:", error);
      addNotification({ message: '계층 구조 복구 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const addMemoryCard = useCallback(async (cardData: Omit<MemoryArchiveCard, 'id' | 'novelId' | 'order' | 'createdAt'>) => {
    if (!currentNovel || !user) return null;
    const cardId = Math.random().toString(36).substr(2, 9);
    const now = Date.now();
    const newCard: MemoryArchiveCard = {
      id: cardId,
      novelId: currentNovel.id,
      ...cardData,
      order: now,
      createdAt: now
    };

    try {
      await setDoc(doc(db, 'novels', currentNovel.id, 'memoryCards', cardId), {
        ...newCard,
        updatedAt: serverTimestamp()
      });
      return newCard;
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.CREATE, `novels/${currentNovel.id}/memoryCards`);
      return null;
    }
  }, [currentNovel, user, addNotification]);

  const updateMemoryCard = useCallback(async (cardId: string, updates: Partial<MemoryArchiveCard>) => {
    if (!currentNovel || !user) return false;

    setCurrentNovel(prev => {
      if (prev?.id === currentNovel.id) {
        const updated = (prev.memoryCards || []).map(c => c.id === cardId ? { ...c, ...updates } : c);
        return { ...prev, memoryCards: updated };
      }
      return prev;
    });

    try {
      await updateDoc(doc(db, 'novels', currentNovel.id, 'memoryCards', cardId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.UPDATE, `novels/${currentNovel.id}/memoryCards/${cardId}`);
      return false;
    }
  }, [currentNovel, user, addNotification]);

  const deleteMemoryCard = useCallback(async (cardId: string) => {
    if (!currentNovel || !user) return false;

    setCurrentNovel(prev => {
      if (prev?.id === currentNovel.id) {
        return {
          ...prev,
          memoryCards: (prev.memoryCards || []).filter(c => c.id !== cardId)
        };
      }
      return prev;
    });

    try {
      await deleteDoc(doc(db, 'novels', currentNovel.id, 'memoryCards', cardId));
      return true;
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.DELETE, `novels/${currentNovel.id}/memoryCards/${cardId}`);
      return false;
    }
  }, [currentNovel, user, addNotification]);

  const commitMemoryProposal = useCallback(async (finalMemoryText: string, newCards: MemoryArchiveEntryDraft[] = []) => {
    if (!currentNovel || !user) return false;
    const novelId = currentNovel.id;

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'novels', novelId), {
        storyMemory: finalMemoryText,
        updatedAt: serverTimestamp()
      });

      const now = Date.now();
      const createdCards: MemoryArchiveCard[] = [];
      newCards.forEach((draft, idx) => {
        const cardRef = doc(collection(db, 'novels', novelId, 'memoryCards'));
        const newCard: MemoryArchiveCard = {
          id: cardRef.id,
          novelId,
          type: draft.type,
          tags: draft.tags,
          time: draft.time,
          content: draft.content,
          lasting: draft.lasting,
          order: now + idx,
          createdAt: now + idx
        };
        batch.set(cardRef, newCard);
        createdCards.push(newCard);
      });

      await batch.commit();

      setCurrentNovel(prev => {
        if (prev?.id === novelId) {
          const combinedCards = [...(prev.memoryCards || []), ...createdCards];
          return {
            ...prev,
            storyMemory: finalMemoryText,
            memoryCards: combinedCards
          };
        }
        return prev;
      });

      addNotification({
        message: newCards.length > 0 
          ? `핵심 기억이 갱신되고 보관소 카드 ${newCards.length}장이 추가되었습니다.`
          : '핵심 기억이 성공적으로 갱신되었습니다.',
        type: 'success'
      });
      return true;
    } catch (error) {
      console.error("Failed to commit memory proposal:", error);
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      return false;
    }
  }, [currentNovel, user, addNotification]);

  const saveNovel = useCallback(async (novelToSave?: Novel, silent = false, htmlContent?: string) => {
    const novel = novelToSave || currentNovelRef.current;
    if (!novel || !user) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const lastSaved = lastSavedNovelRef.current;
    const updates: any = {};
    let contentChanged = false;
    let loreChanged = false;
    
    // Lazy Evaluation: Pull the freshest content directly from the editor instance if available
    let latestHTML = htmlContent;
    if (latestHTML === undefined && novel.id === currentNovelRef.current?.id) {
      if (getEditorContent) {
        latestHTML = getEditorContent();
        lastContentRef.current = latestHTML; // keep ref in sync
      } else {
        latestHTML = lastContentRef.current;
      }
    }
    const finalContent = latestHTML !== undefined ? latestHTML : novel.content;

    if (!lastSaved || lastSaved.id !== novel.id) {
      updates.title = novel.title;
      updates.settings = novel.settings;
      updates.storyMemory = novel.storyMemory || "";
      updates.plot = novel.plot || "";
      updates.type = novel.type || 'item';
      updates.parentId = novel.parentId || null;
      updates.order = novel.order || 0;
      updates.updatedAt = serverTimestamp();
      contentChanged = true;
      loreChanged = true;
    } else {
      if (novel.title !== lastSaved.title) updates.title = novel.title;
      if (JSON.stringify(novel.settings) !== JSON.stringify(lastSaved.settings)) updates.settings = novel.settings;
      if (novel.storyMemory !== lastSaved.storyMemory) updates.storyMemory = novel.storyMemory || "";
      if ((novel.plot || "") !== (lastSaved.plot || "")) updates.plot = novel.plot || "";
      if (novel.type !== lastSaved.type) updates.type = novel.type || 'item';
      if (novel.parentId !== lastSaved.parentId) updates.parentId = novel.parentId || null;
      if (novel.order !== lastSaved.order) updates.order = novel.order || 0;
      
      if (finalContent === undefined || finalContent === null) {
        contentChanged = false;
      } else if (finalContent !== (lastSaved?.content || "")) {
        contentChanged = true;
      }
      
      if (JSON.stringify(novel.loreEntries) !== JSON.stringify(lastSaved?.loreEntries)) loreChanged = true;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
      }
    }

    const hasMetadataChanges = Object.keys(updates).length > 0;
    if (!hasMetadataChanges && !contentChanged && !loreChanged) {
      if (!silent) {
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2000);
      }
      return true;
    }

    setIsSaving(true);
    let notifyId: string | null = null;
    if (!silent) {
      if (saveNotifyId.current) removeNotification(saveNotifyId.current);
      saveNotifyId.current = addNotification({ message: "Saving...", type: 'loading' });
      notifyId = saveNotifyId.current;
    }

    try {
      const promises = [];
      if (hasMetadataChanges || contentChanged || loreChanged) {
        const metadataUpdates: any = { ...updates };
        if (!hasMetadataChanges) metadataUpdates.updatedAt = serverTimestamp();
        promises.push(updateDoc(doc(db, 'novels', novel.id), metadataUpdates));
      }

      if (contentChanged && finalContent !== undefined && finalContent !== null) {
        promises.push(setDoc(doc(db, 'novels', novel.id, 'contents', 'main'), {
          content: finalContent,
          updatedAt: serverTimestamp()
        }));
      }

      await Promise.all(promises);
      
      // Update lastSaved reference
      lastSavedNovelRef.current = JSON.parse(JSON.stringify(novel));
      if (lastSavedNovelRef.current) {
        lastSavedNovelRef.current.content = finalContent;
        lastSavedNovelRef.current.plot = novel.plot || "";
        lastSavedNovelRef.current.storyMemory = novel.storyMemory || "";
      }
      
      // Silently update React state to match what was saved, without triggering editor reload
      setCurrentNovel(prev => {
        if (prev?.id === novel.id) {
          return {
            ...prev,
            content: finalContent !== undefined ? finalContent : prev.content,
            plot: novel.plot !== undefined ? novel.plot : prev.plot,
            storyMemory: novel.storyMemory !== undefined ? novel.storyMemory : prev.storyMemory
          };
        }
        return prev;
      });
      
      if (!silent && notifyId) {
        updateNotification(notifyId, { message: "Saved successfully", type: 'success' });
        setTimeout(() => removeNotification(notifyId!), 2000);
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2000);
      }
      return true;
    } catch (error) {
      console.error("Failed to save novel:", error);
      if (!silent && notifyId) {
        updateNotification(notifyId, { message: getFriendlyErrorMessage(error), type: 'error' });
      } else if (silent) {
        // If it was a silent auto-save but failed critically, we should probably warn the user!
        addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      }
      try {
        handleFirestoreError(error, OperationType.UPDATE, `novels/${novel.id}`);
      } catch(e) {
        // Swallow the thrown error to prevent unhandled rejections during background auto-saves
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, addNotification, removeNotification, updateNotification, setShowSavedIndicator, getEditorContent]);

  const saveNovelRef = useRef(saveNovel);
  useEffect(() => {
    saveNovelRef.current = saveNovel;
  }, [saveNovel]);

  const updateNovelContent = useCallback((id: string, updates: Partial<Novel>, silent = false, immediate = false) => {
      // We no longer update React state immediately for content changes to avoid race conditions.
      // However, for metadata/memory/plot updates, we MUST update the state immediately so the UI reflects it.
      const { content, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        setCurrentNovel(prev => prev?.id === id ? { ...prev, ...otherUpdates } : prev);
      }

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (immediate) {
        const targetNovel = currentNovelRef.current?.id === id
          ? { ...currentNovelRef.current, ...otherUpdates }
          : undefined;
        saveNovelRef.current(targetNovel, silent, content);
      } else {
        autoSaveTimerRef.current = setTimeout(() => {
          saveNovelRef.current(undefined, silent, content);
        }, 2000);
      }
  }, []);

  return {
    currentNovel,
    setCurrentNovel,
    lastSavedNovelRef,
    lastContentRef,
    isSaving,
    hasError,
    updateLoreEntry,
    addLoreEntry,
    deleteLoreEntry,
    moveLoreEntryToRoot,
    healLoreHierarchy,
    addMemoryCard,
    updateMemoryCard,
    deleteMemoryCard,
    commitMemoryProposal,
    saveNovel,
    updateNovelContent
  };
}
