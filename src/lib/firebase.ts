import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, { 
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  // Forza la selezione dell'account per evitare loop infiniti su Safari
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log("Tentativo di login con Google Popup...");

  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Accesso Google riuscito:", result.user.email);
    return result;
  } catch (error: any) {
    console.error("Dettaglio errore login:", error);
    
    if (error.code === 'auth/popup-blocked') {
      alert("⚠️ SAFARI HA BLOCCATO IL LOGIN!\n\nPer favore, clicca sull'icona in alto a destra (quadrato con freccia) per aprire l'app a schermo intero. Safari non permette il login dentro i riquadri di anteprima.");
    } else if (error.code === 'auth/internal-error' || error.message.includes('networkError')) {
      alert("⚠️ PROBLEMA DI CONNESSIONE / PRIVACY:\n\nSu iPhone/Safari, prova ad aprire l'app 'In una nuova scheda' usando il pulsante in alto a destra.");
    } else if (error.code === 'auth/cancelled-by-user' || error.code === 'auth/popup-closed-by-user') {
      // Annulato dall'utente
    } else {
      alert("Errore Google Auth: " + error.code);
    }
    
    throw error;
  }
};

export const logout = () => signOut(auth);

// Error Handling Infrastructure
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error Detail: ', JSON.stringify(errInfo));
  // Not throwing here anymore to prevent component crashes in listeners
  // Components should handle the error visually if needed
  return errInfo;
}

// remove testConnection
