import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import BandSelector from './components/BandSelector';
import BandMembersList from './components/BandMembersList';
import MemberAvailabilityInput from './components/MemberAvailabilityInput';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import BandEvents from './components/BandEvents';
import { Music } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyDC2guxU-Az8vVdrex55mqDJbFjTTiqfXU",
  authDomain: "bandas-b588d.firebaseapp.com",
  projectId: "bandas-b588d",
  storageBucket: "bandas-b588d.appspot.com",
  messagingSenderId: "1098469566661",
  appId: "1:1098469566661:web:fde7b4c35cb8727d43e8ac",
  measurementId: "G-MBR7EF46BT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [selectedBand, setSelectedBand] = useState(null);
  const [bands, setBands] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const fetchBands = async () => {
    const bandsCollection = collection(db, 'bands');
    const bandsSnapshot = await getDocs(bandsCollection);
    const bandsData = bandsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBands(bandsData);
  };

  useEffect(() => {
    fetchBands();
  }, []);

  const handleBandUpdate = async () => {
    if (selectedBand) {
      const bandDoc = await getDoc(doc(db, 'bands', selectedBand.id));
      const updatedBandData = { id: bandDoc.id, ...bandDoc.data() };
      setSelectedBand(updatedBandData);
      await fetchBands();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-600 flex items-center justify-center">
          <Music className="mr-2" />
          Gestor de Disponibilidad para Bandas
        </h1>
      </header>
      <div className="max-w-7xl mx-auto">
        <BandSelector bands={bands} selectedBand={selectedBand} setSelectedBand={setSelectedBand} />
        {selectedBand && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <BandMembersList 
                db={db} 
                selectedBand={selectedBand} 
                onBandUpdate={handleBandUpdate}
                selectedMember={selectedMember}
                setSelectedMember={setSelectedMember}
              />
              <MemberAvailabilityInput 
                db={db} 
                selectedBand={selectedBand} 
                selectedMember={selectedMember}
                setSelectedMember={setSelectedMember}
              />
            </div>
            <AvailabilityCalendar db={db} selectedBand={selectedBand} />
            <BandEvents db={db} selectedBand={selectedBand} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;