import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { X, Plus } from 'lucide-react';
import Select from 'react-select';

interface Instrument {
  id: string;
  name: string;
  category: string;
}

interface AddMemberModalProps {
  db: any;
  selectedBand: any;
  onClose: () => void;
  onMemberAdded: (newMember: any) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ db, selectedBand, onClose, onMemberAdded }) => {
  const [name, setName] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<{ value: string; label: string }[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isSubstitute, setIsSubstitute] = useState(false);

  useEffect(() => {
    const fetchInstruments = async () => {
      const instrumentsCollection = collection(db, 'instruments');
      const instrumentsSnapshot = await getDocs(instrumentsCollection);
      const instrumentsList = instrumentsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        category: doc.data().category || 'Otros'
      }));
      setInstruments(instrumentsList);
    };

    fetchInstruments();
  }, [db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && selectedInstruments.length > 0) {
      const memberId = name.toLowerCase().replace(/\s+/g, '');
      
      // Check if member already exists
      const memberRef = doc(db, 'members', memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        // Create new member document
        await setDoc(memberRef, {
          name,
          instruments: selectedInstruments.map(instrument => instrument.value),
        });
      }
      
      // Add member to the band
      const bandRef = doc(db, 'bands', selectedBand.id);
      await updateDoc(bandRef, {
        [isSubstitute ? 'substitutes' : 'members']: arrayUnion({
          id: memberId,
          instruments: selectedInstruments.map(instrument => instrument.value),
        }),
      });

      const newMember = {
        id: memberId,
        name,
        instruments: selectedInstruments.map(instrument => ({
          id: instrument.value,
          name: instrument.label
        })),
      };

      onMemberAdded(newMember);
      onClose();
    }
  };

  const groupedOptions = instruments.reduce((acc, instrument) => {
    if (!acc[instrument.category]) {
      acc[instrument.category] = [];
    }
    acc[instrument.category].push({
      value: instrument.id,
      label: instrument.name,
    });
    return acc;
  }, {} as Record<string, { value: string; label: string }[]>);

  const options = Object.entries(groupedOptions).map(([category, instruments]) => ({
    label: category,
    options: instruments,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Agregar Nuevo Miembro</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Nombre:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Instrumentos:</label>
            <Select
              isMulti
              options={options}
              value={selectedInstruments}
              onChange={(selected) => setSelectedInstruments(selected as { value: string; label: string }[])}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Selecciona los instrumentos..."
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isSubstitute}
                onChange={(e) => setIsSubstitute(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Es sustituto</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition flex items-center justify-center"
          >
            <Plus className="mr-2" />
            Agregar Miembro
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;