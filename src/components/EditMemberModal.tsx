import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { X, Save } from 'lucide-react';
import Select from 'react-select';

interface Instrument {
  id: string;
  name: string;
  category: string;
}

interface EditMemberModalProps {
  db: any;
  selectedBand: any;
  member: any;
  onClose: () => void;
  onMemberUpdated: () => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ db, selectedBand, member, onClose, onMemberUpdated }) => {
  const [name, setName] = useState(member.name);
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
    setSelectedInstruments(member.instruments.map(i => ({ value: i.id, label: i.name })));
    setIsSubstitute(selectedBand.substitutes?.some(sub => sub.id === member.id) || false);
  }, [db, member, selectedBand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && selectedInstruments.length > 0) {
      const bandRef = doc(db, 'bands', selectedBand.id);
      const memberRef = doc(db, 'members', member.id);

      // Update member document
      await updateDoc(memberRef, {
        name,
        instruments: selectedInstruments.map(instrument => instrument.value),
      });

      // Remove member from current list (members or substitutes)
      await updateDoc(bandRef, {
        members: arrayRemove({ id: member.id, instruments: member.instruments.map(i => i.id) }),
        substitutes: arrayRemove({ id: member.id, instruments: member.instruments.map(i => i.id) }),
      });

      // Add member to the correct list (members or substitutes)
      await updateDoc(bandRef, {
        [isSubstitute ? 'substitutes' : 'members']: arrayUnion({
          id: member.id,
          instruments: selectedInstruments.map(instrument => instrument.value),
        }),
      });

      onMemberUpdated();
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Editar Miembro</h2>
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
            <Save className="mr-2" />
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;