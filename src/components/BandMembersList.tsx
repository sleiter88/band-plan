import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { UserCircle, Edit, Trash, UserPlus, AlertTriangle } from 'lucide-react';
import AddMemberModal from './AddMemberModal';
import EditMemberModal from './EditMemberModal';
import { getDocs, getDoc } from '../utils/firebaseUtils';

interface Instrument {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  instruments: Instrument[];
}

const BandMembersList = ({ db, selectedBand, onBandUpdate, selectedMember, setSelectedMember }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [substitutes, setSubstitutes] = useState<Member[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const fetchMembersAndInstruments = async () => {
    if (selectedBand) {
      const membersData: Member[] = [];
      const substitutesData: Member[] = [];
      const instrumentsCache: { [key: string]: Instrument } = {};

      // Fetch all instruments and cache them
      const instrumentsSnapshot = await getDocs(collection(db, 'instruments'));
      instrumentsSnapshot.forEach((doc) => {
        instrumentsCache[doc.id] = { id: doc.id, name: doc.data().name };
      });

      // Fetch the latest band data
      const bandDoc = await getDoc(doc(db, 'bands', selectedBand.id));
      const updatedBandData = bandDoc.data();

      // Fetch members data
      const fetchMemberData = async (memberRef, isSubstitute = false) => {
        const memberDoc = await getDoc(doc(db, 'members', memberRef.id));
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          const memberInstruments = memberRef.instruments.map(
            (instrumentId: string) => instrumentsCache[instrumentId]
          ).filter(Boolean);

          const memberInfo = {
            id: memberDoc.id,
            name: memberData.name,
            instruments: memberInstruments,
          };

          if (isSubstitute) {
            substitutesData.push(memberInfo);
          } else {
            membersData.push(memberInfo);
          }
        }
      };

      // Fetch regular members
      for (const memberRef of updatedBandData.members || []) {
        await fetchMemberData(memberRef);
      }

      // Fetch substitute members
      for (const substituteRef of updatedBandData.substitutes || []) {
        await fetchMemberData(substituteRef, true);
      }

      setMembers(membersData);
      setSubstitutes(substitutesData);
    }
  };

  useEffect(() => {
    fetchMembersAndInstruments();
  }, [db, selectedBand]);

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
  };

  const handleDeleteMember = (member: Member) => {
    setDeletingMember(member);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteMember = async () => {
    if (deletingMember) {
      const bandRef = doc(db, 'bands', selectedBand.id);
      
      // Eliminar de la lista de miembros principales
      await updateDoc(bandRef, {
        members: arrayRemove({ id: deletingMember.id, instruments: deletingMember.instruments.map(i => i.id) }),
      });

      // Eliminar de la lista de sustitutos
      await updateDoc(bandRef, {
        substitutes: arrayRemove({ id: deletingMember.id, instruments: deletingMember.instruments.map(i => i.id) }),
      });

      await fetchMembersAndInstruments();
      onBandUpdate();

      setShowDeleteConfirmation(false);
      setDeletingMember(null);
      if (selectedMember && selectedMember.id === deletingMember.id) {
        setSelectedMember(null);
      }
    }
  };

  const handleMemberAdded = async (newMember: Member) => {
    await fetchMembersAndInstruments();
    onBandUpdate();
  };

  const handleMemberUpdated = async () => {
    await fetchMembersAndInstruments();
    onBandUpdate();
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(selectedMember && selectedMember.id === member.id ? null : member);
  };

  const renderMemberList = (memberList: Member[], title: string) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      {memberList.length > 0 ? (
        <ul className="space-y-2">
          {memberList.map((member) => (
            <li 
              key={member.id} 
              className={`flex items-center justify-between bg-white p-3 rounded-lg shadow cursor-pointer transition-colors duration-200 ${
                selectedMember && selectedMember.id === member.id ? 'bg-indigo-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleMemberSelect(member)}
            >
              <div className="flex items-center">
                <UserCircle className={`mr-2 ${selectedMember && selectedMember.id === member.id ? 'text-indigo-500' : 'text-gray-400'}`} size={24} />
                <span className="font-medium">
                  {member.name} <span className="text-gray-500">({member.instruments.map(i => i.name).join(', ')})</span>
                </span>
              </div>
              <div>
                <button onClick={(e) => { e.stopPropagation(); handleEditMember(member); }} className="text-blue-500 mr-2"><Edit size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteMember(member); }} className="text-red-500"><Trash size={18} /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No hay {title.toLowerCase()} en esta banda.</p>
      )}
    </div>
  );

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 flex items-center">
        <UserCircle className="mr-2" />
        Miembros de {selectedBand?.name}
      </h2>
      {renderMemberList(members, "Miembros")}
      {renderMemberList(substitutes, "Sustitutos")}
      <button
        onClick={() => setShowAddModal(true)}
        className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition flex items-center justify-center w-full"
      >
        <UserPlus className="mr-2" />
        Agregar Miembro
      </button>
      {showAddModal && (
        <AddMemberModal
          db={db}
          selectedBand={selectedBand}
          onClose={() => setShowAddModal(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}
      {editingMember && (
        <EditMemberModal
          db={db}
          selectedBand={selectedBand}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onMemberUpdated={handleMemberUpdated}
        />
      )}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <div className="flex items-center mb-4 text-red-500">
              <AlertTriangle className="mr-2" size={24} />
              <h3 className="text-xl font-semibold">Confirmar Eliminación</h3>
            </div>
            <p className="mb-4">
              ¿Estás seguro de que quieres eliminar a {deletingMember?.name} de la banda?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteMember}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BandMembersList;