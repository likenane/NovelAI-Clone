import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../firebase';
import { OperationType, FirestoreErrorInfo } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('Quota') || msg.includes('quota') || msg.includes('resource-exhausted')) {
    return 'Database quota exceeded. Failed to save changes. Please try again later.';
  }
  if (msg.includes('Missing or insufficient permissions')) {
    return 'Access denied. You do not have permission.';
  }
  return 'A database error occurred. Changes may not be saved.';
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || '',
      email: auth.currentUser?.email || '',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || '',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || '',
        email: provider.email || '',
        photoUrl: provider.photoURL || ''
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const stripInlineComments = (text: string): string => {
  if (!text) return text;
  // Match // only at the start of a line or after whitespace
  return text.replace(/(^|\s)\/\/.*$/gm, '');
};

export function stitchAndTrimAnchor(tailText: string, aiResponse: string): string {
  if (!tailText || !aiResponse) return aiResponse;

  let candidateResponse = aiResponse;
  const cleanTail = tailText.trimEnd();
  
  const minMatchLength = 4;
  const maxSearchLength = Math.min(80, cleanTail.length);
  const tailSlice = cleanTail.slice(-maxSearchLength);

  let bestMatchLength = 0;

  for (let i = 0; i <= tailSlice.length - minMatchLength; i++) {
    const candidate = tailSlice.slice(i);
    if (candidateResponse.startsWith(candidate)) {
      bestMatchLength = candidate.length;
      break;
    }
  }

  if (bestMatchLength === 0) {
    const trimmedLead = candidateResponse.trimStart();
    const leadOffset = candidateResponse.length - trimmedLead.length;
    for (let i = 0; i <= tailSlice.length - minMatchLength; i++) {
      const candidate = tailSlice.slice(i);
      if (trimmedLead.startsWith(candidate)) {
        bestMatchLength = leadOffset + candidate.length;
        break;
      }
    }
  }

  if (bestMatchLength > 0) {
    return candidateResponse.slice(bestMatchLength);
  }

  return candidateResponse;
}

/**
 * Extracts only the trailing N characters of a novel's HTML content,
 * maintaining valid DOM / paragraph structures and preventing broken tags.
 */
export function sliceNovelContentTail(htmlContent: string, maxChars: number = 2000): string {
  if (!htmlContent || !htmlContent.trim()) return "";
  if (maxChars <= 0) return "";

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const body = doc.body;

      const childNodes = Array.from(body.childNodes);
      if (childNodes.length === 0) return htmlContent;

      const totalText = body.textContent || '';
      if (totalText.length <= maxChars) {
        return htmlContent;
      }

      let accumulatedChars = 0;
      const selectedNodes: Node[] = [];

      for (let i = childNodes.length - 1; i >= 0; i--) {
        const node = childNodes[i];
        const nodeTextLength = node.textContent?.length || 0;

        if (accumulatedChars + nodeTextLength < maxChars) {
          selectedNodes.unshift(node.cloneNode(true));
          accumulatedChars += nodeTextLength;
        } else {
          const remainingCharsNeeded = maxChars - accumulatedChars;
          if (remainingCharsNeeded > 0) {
            const fullNodeText = node.textContent || '';
            const trimmedText = fullNodeText.slice(-remainingCharsNeeded);
            const p = doc.createElement('p');
            p.textContent = trimmedText;
            selectedNodes.unshift(p);
          }
          break;
        }
      }

      const container = doc.createElement('div');
      selectedNodes.forEach(n => container.appendChild(n));
      return container.innerHTML;
    } catch (e) {
      console.error("Failed to slice HTML content by DOM:", e);
    }
  }

  // Fallback for non-DOM environments
  const stripped = htmlContent.replace(/<[^>]*>/g, '');
  if (stripped.length <= maxChars) return htmlContent;
  const tail = stripped.slice(-maxChars);
  return `<p>${tail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
}
