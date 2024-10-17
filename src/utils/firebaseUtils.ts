import { getDocs as originalGetDocs, getDoc as originalGetDoc, QuerySnapshot, DocumentData, Query, DocumentReference, DocumentSnapshot } from 'firebase/firestore';

// Función envoltura para getDocs
export const getDocs = async (query: Query<DocumentData>): Promise<QuerySnapshot<DocumentData>> => {
  console.log('Reading data from Firebase:', query);
  const snapshot = await originalGetDocs(query);
  console.log('Data read complete:', snapshot.docs.map(doc => doc.id));
  return snapshot;
};

// Función envoltura para getDoc
export const getDoc = async (docRef: DocumentReference<DocumentData>): Promise<DocumentSnapshot<DocumentData>> => {
  console.log('Reading document from Firebase:', docRef.id);
  const docSnapshot = await originalGetDoc(docRef);
  console.log('Document read complete:', docSnapshot.id);
  return docSnapshot;
};

// Puedes crear más funciones envoltura para otras operaciones si es necesario
