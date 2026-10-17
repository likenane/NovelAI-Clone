import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs,
  orderBy,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { Novel, LoreEntry, MemoryArchiveCard, OperationType, DuplicateNovelOptions } from '../types';
import { GLOBAL_DEFAULTS } from '../constants';
import { handleFirestoreError, getFriendlyErrorMessage, sliceNovelContentTail } from '../lib/utils';
import { deepMergeNovelSettings, sanitizeAndRemapLoreEntries } from '../lib/novelIO';
import { purgeNovelCounters } from '../lib/counterStorage';

export function useNovels(user: FirebaseUser | null, addNotification?: (n: any) => string) {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);

  const isDraggingRef = useRef(false);
  const snapshotBufferRef = useRef<Novel[] | null>(null);
  const orphanedWriteIdsRef = useRef<Set<string>>(new Set());

  // Listen for global Quota error to unblock hanging UI states
  useEffect(() => {
    const handleQuotaError = () => {
      setIsSaving(false);
    };
    window.addEventListener('firestore-quota-error', handleQuotaError);
    return () => window.removeEventListener('firestore-quota-error', handleQuotaError);
  }, []);

  // Keep ref up to date without re-triggering effect
  useEffect(() => {
    isDraggingRef.current = isDraggingGlobal;
  }, [isDraggingGlobal]);

  useEffect(() => {
    if (!user) {
      setNovels([]);
      return;
    }

    const q = query(
      collection(db, 'novels'),
      where('authorUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();
      const validNovels: Novel[] = [];
      const orphanIdsToDelete: string[] = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        
        // Shadow Filter & GC
        if (data.isImporting) {
          if (data.createdAt && (now - data.createdAt > ONE_HOUR)) {
            orphanIdsToDelete.push(docSnap.id);
          }
          return;
        }

        let novelData = {
          id: docSnap.id,
          ...data,
          settings: deepMergeNovelSettings(data.settings)
        } as Novel;

        // Migrate context to storyMemory if needed
        if (novelData.settings?.context && !novelData.storyMemory) {
          novelData.storyMemory = novelData.settings.context;
        }
        
        validNovels.push(novelData);
      });

      // Background Garbage Collection
      if (orphanIdsToDelete.length > 0) {
        orphanIdsToDelete.forEach(async (id) => {
          try {
            // Delete content
            await deleteDoc(doc(db, 'novels', id, 'contents', 'main'));
            // Delete loreEntries (fetch and delete to prevent orphaned subcollections)
            const loreDocs = await getDocs(collection(db, 'novels', id, 'loreEntries'));
            const deletePromises = loreDocs.docs.map(lDoc => deleteDoc(lDoc.ref));
            await Promise.all(deletePromises);
            // Delete memoryCards
            const cardDocs = await getDocs(collection(db, 'novels', id, 'memoryCards'));
            const deleteCardPromises = cardDocs.docs.map(cDoc => deleteDoc(cDoc.ref));
            await Promise.all(deleteCardPromises);
            // Delete parent
            await deleteDoc(doc(db, 'novels', id));
          } catch (e) {
            console.error("Garbage Collection Error: ", e);
          }
        });
      }

      if (isDraggingRef.current) {
        snapshotBufferRef.current = validNovels;
        // Orphan Bypass Policy
        if (orphanedWriteIdsRef.current.size > 0) {
           setNovels(currentNovels => {
             const updated = [...currentNovels];
             let changed = false;
             orphanedWriteIdsRef.current.forEach(orphanId => {
               const orphanFromDb = validNovels.find(n => n.id === orphanId);
               if (orphanFromDb) {
                 const localIdx = updated.findIndex(n => n.id === orphanId);
                 if (localIdx !== -1) {
                   updated[localIdx] = orphanFromDb;
                   changed = true;
                 }
               }
             });
             return changed ? updated : currentNovels;
           });
        }
      } else {
        setNovels(validNovels);
        snapshotBufferRef.current = null;
      }
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [user]);

// Data Pipeline Methods
  const createNovelWithSubcollections = async (
    novelMetadata: Omit<Novel, 'id' | 'content' | 'loreEntries'>,
    content: string,
    loreEntries: LoreEntry[],
    options: { titleSuffix?: string; memoryCards?: MemoryArchiveCard[] } = {}
  ): Promise<string | undefined> => {
    if (!user) return;
    setIsSaving(true);
    
    // Create reference to reserve ID
    const newDocRef = doc(collection(db, 'novels'));
    const finalTitle = options.titleSuffix ? `${novelMetadata.title} ${options.titleSuffix}` : novelMetadata.title;
    const cards = options.memoryCards || [];
    
    const writtenRefs: any[] = [];
    const totalOps = 1 + 1 + loreEntries.length + cards.length; // Meta + Content + Lore + Cards

    try {
      if (totalOps <= 500) {
        // Safe within single batch limit -> Pure atomicity
        const batch = writeBatch(db);
        
        batch.set(newDocRef, {
          ...novelMetadata,
          title: finalTitle,
          updatedAt: serverTimestamp(),
          createdAt: Date.now()
        });
        
        const contentRef = doc(db, 'novels', newDocRef.id, 'contents', 'main');
        batch.set(contentRef, {
          content,
          updatedAt: serverTimestamp()
        });

        loreEntries.forEach(lore => {
          const lRef = doc(db, 'novels', newDocRef.id, 'loreEntries', lore.id);
          batch.set(lRef, {
            ...lore,
            updatedAt: serverTimestamp()
          });
        });

        cards.forEach(card => {
          const cRef = doc(db, 'novels', newDocRef.id, 'memoryCards', card.id);
          batch.set(cRef, {
            ...card,
            novelId: newDocRef.id,
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
        return newDocRef.id;

      } else {
        // Multi-batch logic with Atomic Reveal (Shadow Upload)
        const CHUNK_SIZE = 498; 
        const firstBatch = writeBatch(db);
        
        // 1st batch: Meta (shadow), Content, and initial Lore
        firstBatch.set(newDocRef, {
          ...novelMetadata,
          title: finalTitle,
          updatedAt: serverTimestamp(),
          createdAt: Date.now(),
          isImporting: true // SHADOW UPLOAD FLAG
        });
        writtenRefs.push(newDocRef);

        const contentRef = doc(db, 'novels', newDocRef.id, 'contents', 'main');
        firstBatch.set(contentRef, { content, updatedAt: serverTimestamp() });
        writtenRefs.push(contentRef);
        
        const firstLoreChunk = loreEntries.slice(0, Math.min(CHUNK_SIZE, loreEntries.length));
        firstLoreChunk.forEach(lore => {
          const lRef = doc(db, 'novels', newDocRef.id, 'loreEntries', lore.id);
          firstBatch.set(lRef, { ...lore, updatedAt: serverTimestamp() });
          writtenRefs.push(lRef);
        });
        
        await firstBatch.commit();
        
        // Chunk remaining lore
        let i = firstLoreChunk.length;
        while (i < loreEntries.length) {
          const isLastBatch = (loreEntries.length - i <= 500); 
          const chunkBatch = writeBatch(db);
          
          if (isLastBatch) {
            // Atomic Reveal: remove isImporting in the very last batch
            const remaining = loreEntries.slice(i);
            remaining.forEach(lore => {
              const lRef = doc(db, 'novels', newDocRef.id, 'loreEntries', lore.id);
              chunkBatch.set(lRef, { ...lore, updatedAt: serverTimestamp() });
              writtenRefs.push(lRef);
            });
            chunkBatch.update(newDocRef, { isImporting: deleteField() });
            await chunkBatch.commit();
            break;
          } else {
            // Write normal inter-batch
            const slice = loreEntries.slice(i, i + 500);
            slice.forEach(lore => {
              const lRef = doc(db, 'novels', newDocRef.id, 'loreEntries', lore.id);
              chunkBatch.set(lRef, { ...lore, updatedAt: serverTimestamp() });
              writtenRefs.push(lRef);
            });
            await chunkBatch.commit();
            i += 500;
          }
        }
        
        return newDocRef.id;
      }
    } catch (error) {
      console.error("Pipeline Write Error:", error);
      // Attempt manual rollback for cleanly failed multi-batch chunks.
      // If the app closes, they remain trapped via `isImporting: true` anyway.
      for (let i = writtenRefs.length - 1; i >= 0; i--) {
        try {
          await deleteDoc(writtenRefs[i]);
        } catch (e) {
          // Ignore fallback errors
        }
      }
      addNotification?.({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.CREATE, 'novels');
    } finally {
      setIsSaving(false);
    }
  };

  const exportCompleteNovelData = async (novelId: string): Promise<Novel> => {
    const [metaSnap, contentSnap, loreSnap, cardsSnap] = await Promise.all([
      getDoc(doc(db, 'novels', novelId)),
      getDoc(doc(db, 'novels', novelId, 'contents', 'main')).catch(() => ({ exists: () => false, data: () => ({}) } as any)),
      getDocs(collection(db, 'novels', novelId, 'loreEntries')).catch(() => ({ empty: true, docs: [] } as any)),
      getDocs(collection(db, 'novels', novelId, 'memoryCards')).catch(() => ({ empty: true, docs: [] } as any))
    ]);

    if (!metaSnap.exists()) {
      throw new Error("Novel not found or access denied");
    }

    const metaData = metaSnap.data() as Omit<Novel, 'id' | 'content' | 'loreEntries'> & { content?: string, loreEntries?: any };
    
    // Legacy Fallback for content
    let extractedContent = "";
    if (contentSnap.exists()) {
      extractedContent = contentSnap.data().content || "";
    } else if (metaData.content) {
       extractedContent = metaData.content;
    }

    // Legacy Fallback for lore
    let extractedLore: LoreEntry[] = [];
    if (!loreSnap.empty) {
      extractedLore = loreSnap.docs.map(d => ({ id: d.id, ...d.data() } as LoreEntry));
    } else if (metaData.loreEntries && Array.isArray(metaData.loreEntries)) {
      extractedLore = metaData.loreEntries;
    }

    // Extract memory cards
    let extractedCards: MemoryArchiveCard[] = [];
    if (!cardsSnap.empty) {
      extractedCards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MemoryArchiveCard));
    }

    // Clean up purely structural data before creating memory object
    const finalData = { ...metaData };
    delete finalData.content;
    delete finalData.loreEntries;
    delete (finalData as any).isImporting;

    // Zero-loss resolution of plot and storyMemory
    const finalPlot = typeof metaData.plot === 'string' ? metaData.plot : "";
    const finalStoryMemory = typeof metaData.storyMemory === 'string' 
      ? metaData.storyMemory 
      : (typeof metaData.settings?.context === 'string' ? metaData.settings.context : "");

    return {
      ...finalData,
      id: novelId,
      plot: finalPlot,
      storyMemory: finalStoryMemory,
      settings: deepMergeNovelSettings(metaData.settings),
      content: extractedContent,
      loreEntries: sanitizeAndRemapLoreEntries(extractedLore),
      memoryCards: extractedCards
    } as Novel;
  };

// DND Architecture Methods
  const setDragLock = useCallback((locked: boolean) => {
    setIsDraggingGlobal(locked);
    if (!locked && snapshotBufferRef.current) {
      setNovels(snapshotBufferRef.current);
      snapshotBufferRef.current = null;
    }
  }, []);

  const registerOrphanedWrite = useCallback((id: string) => {
    orphanedWriteIdsRef.current.add(id);
  }, []);

  const applyOptimisticNovels = useCallback((newNovels: Novel[]) => {
    setNovels(newNovels);
  }, []);

  const getBufferedSnapshot = useCallback(() => snapshotBufferRef.current, []);

  const addNovel = async () => {
    if (!user) return;
    
    const newNovelMetadata: Omit<Novel, 'id' | 'content' | 'loreEntries'> = {
      title: "Untitled Novel",
      authorUid: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: { ...GLOBAL_DEFAULTS },
      storyMemory: "",
      plot: ""
    };

    return await createNovelWithSubcollections(newNovelMetadata, "", []);
  };

  const deleteNovel = async (id: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const idsToDelete = new Set<string>([id]);
      
      // Helper to find all children recursively
      const findChildren = (parentId: string) => {
        novels.forEach(novel => {
          if (novel.parentId === parentId) {
            idsToDelete.add(novel.id);
            if (novel.type === 'folder') {
              findChildren(novel.id);
            }
          }
        });
      };
      
      const novelToDeleteObj = novels.find(n => n.id === id);
      if (novelToDeleteObj?.type === 'folder') {
        findChildren(id);
      }

      const batch: Promise<void>[] = [];
      for (const deleteId of idsToDelete) {
        batch.push(deleteDoc(doc(db, 'novels', deleteId)).catch(() => {}));
        // Also delete content document
        batch.push(deleteDoc(doc(db, 'novels', deleteId, 'contents', 'main')).catch(() => {}));
        // Also delete subcollection documents safely
        const [loreDocs, cardDocs] = await Promise.all([
          getDocs(collection(db, 'novels', deleteId, 'loreEntries')).catch(() => ({ docs: [] } as any)),
          getDocs(collection(db, 'novels', deleteId, 'memoryCards')).catch(() => ({ docs: [] } as any))
        ]);
        loreDocs.docs.forEach((d: any) => batch.push(deleteDoc(d.ref).catch(() => {})));
        cardDocs.docs.forEach((d: any) => batch.push(deleteDoc(d.ref).catch(() => {})));
      }
      await Promise.all(batch);
      idsToDelete.forEach(delId => purgeNovelCounters(delId));
    } catch (error) {
      addNotification?.({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.DELETE, `novels/${id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateNovel = useCallback(async (id: string, updates: Partial<Novel>, isSilent = false) => {
    if (!user) return;
    
    // Optimistic UI update
    setNovels(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    try {
      // If content is updated, we save it to the sub-collection instead of the main document
      if ('content' in updates) {
        const { content, ...rest } = updates;
        const promises = [
          setDoc(doc(db, 'novels', id, 'contents', 'main'), {
            content,
            updatedAt: serverTimestamp()
          }),
          updateDoc(doc(db, 'novels', id), {
            ...rest,
            updatedAt: serverTimestamp()
          })
        ];
        await Promise.all(promises);
      } else {
        await updateDoc(doc(db, 'novels', id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      if (!isSilent) {
        addNotification?.({ message: getFriendlyErrorMessage(error), type: 'error' });
        handleFirestoreError(error, OperationType.UPDATE, `novels/${id}`);
      }
    }
  }, [user, handleFirestoreError, addNotification]);

  const duplicateNovel = async (
    novelId: string, 
    options: DuplicateNovelOptions = { mode: 'full', includeContent: true }
  ) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const fullData = await exportCompleteNovelData(novelId);
      
      const { id, content, loreEntries, ...metaData } = fullData;
      
      let contentToDuplicate = "";
      const isSettingsOnly = options.mode === 'settings_only' || options.includeContent === false;
      const isTail = options.mode === 'tail';

      if (isSettingsOnly) {
        contentToDuplicate = "";
      } else if (isTail && content) {
        const charCount = typeof options.tailChars === 'number' && options.tailChars > 0 ? options.tailChars : 2000;
        contentToDuplicate = sliceNovelContentTail(content, charCount);
      } else if (content) {
        contentToDuplicate = content;
      }

      const loreToDuplicate = loreEntries || [];
      const cardsToDuplicate = fullData.memoryCards || [];

      return await createNovelWithSubcollections(
        metaData, 
        contentToDuplicate, 
        loreToDuplicate, 
        { titleSuffix: "(Copy)", memoryCards: cardsToDuplicate }
      );
    } catch (error) {
      console.error("Duplicate Novel Error:", error);
      addNotification?.({ message: getFriendlyErrorMessage(error), type: 'error' });
      handleFirestoreError(error, OperationType.CREATE, 'novels (duplicate)');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    novels,
    isSaving,
    addNovel,
    deleteNovel,
    updateNovel,
    duplicateNovel,
    applyOptimisticNovels,
    setDragLock,
    registerOrphanedWrite,
    getBufferedSnapshot,
    isDraggingGlobal,
    createNovelWithSubcollections,
    exportCompleteNovelData
  };
}
