import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  initializeAuth,
  getAuth,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  Auth
} from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb: Firestore;
try {
  const dbId = (firebaseConfig as Record<string, unknown>).firestoreDatabaseId as string | undefined;
  firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
  enableMultiTabIndexedDbPersistence(firestoreDb).catch(() => {
    // Silent catch for sandboxed environments where indexedDB is disabled
  });
} catch {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [browserSessionPersistence, browserLocalPersistence, indexedDBLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.setCustomParameters({ prompt: 'select_account' });

let cachedDriveAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null) => {
  cachedDriveAccessToken = token;
};

export const getCachedAccessToken = (): string | null => {
  return cachedDriveAccessToken;
};

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errCode = (error as { code?: string })?.code;
  const errMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errCode ? `${errCode}: ${errMessage}` : errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure config is valid
if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error("Firebase configuration is missing or invalid. Check firebase-applet-config.json");
}
