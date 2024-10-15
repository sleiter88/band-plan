import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { doc, setDoc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Select from 'react-select';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

const MemberAvailabilityInput = ({ db, selectedBand, selectedMember, setSelectedMember }) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (selectedBand) {
        const membersRef = collection(db, 'members');
        const snapshot = await getDocs(membersRef);
        const membersData = snapshot.docs
          .map(doc => ({ value: doc.id, label: doc.data().name }))
          .filter(member => 
            selectedBand.members.some(m => m.id === member.value) || 
            selectedBand.substitutes.some(s => s.id === member.value)
          );
        setMembers(membersData);
      }
    };

    fetchMembers();
  }, [db, selectedBand]);

  useEffect(() => {
    const fetchExistingDates = async () => {
      if (selectedMember) {
        const memberRef = doc(db, 'members', selectedMember.id);
        const availabilityRef = collection(memberRef, 'availability');
        const availabilitySnapshot = await getDocs(query(availabilityRef));
        const dates = availabilitySnapshot.docs.map(doc => parse(doc.id, 'yyyy-MM-dd', new Date()));
        setSelectedDates(dates);
      } else {
        setSelectedDates([]);
      }
    };

    fetchExistingDates();
  }, [db, selectedMember]);

  const handleDateChange = async (date: Date) => {
    if (!selectedMember) return;

    const memberRef = doc(db, 'members', selectedMember.id);
    const availabilityRef = collection(memberRef, 'availability');
    const dateString = format(date, 'yyyy-MM-dd');
    const dateDoc = doc(availabilityRef, dateString);

    setSelectedDates(prevDates => {
      const dateExists = prevDates.find(d => d.getTime() === date.getTime());
      if (dateExists) {
        // Remove date
        deleteDoc(dateDoc);
        return prevDates.filter(d => d.getTime() !== date.getTime());
      } else {
        // Add date
        setDoc(dateDoc, { date: dateString, available: true });
        return [...prevDates, date];
      }
    });
  };

  const CustomHeader = ({
    date,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }) => (
    <div className="flex items-center justify-between px-4 py-2 bg-indigo-100">
      <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="text-indigo-600 hover:text-indigo-800">
        <ChevronLeft size={24} />
      </button>
      <h2 className="text-xl font-semibold text-indigo-800">
        {format(date, 'MMMM yyyy', { locale: es })}
      </h2>
      <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="text-indigo-600 hover:text-indigo-800">
        <ChevronRight size={24} />
      </button>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 flex items-center text-indigo-800">
        <CalendarIcon className="mr-2" size={28} />
        Agregar Disponibilidad para {selectedBand?.name}
      </h2>
      <div className="space-y-6">
        <div>
          <label className="block mb-2 text-lg font-medium text-gray-700">Miembro:</label>
          <Select
            options={members}
            value={selectedMember ? { value: selectedMember.id, label: selectedMember.name } : null}
            onChange={(selected) => setSelectedMember(selected ? { id: selected.value, name: selected.label } : null)}
            className="w-full text-lg"
            placeholder="Seleccionar miembro"
            styles={{
              control: (provided) => ({
                ...provided,
                borderColor: '#d1d5db',
                '&:hover': {
                  borderColor: '#9ca3af',
                },
                minHeight: '48px',
              }),
              option: (provided) => ({
                ...provided,
                fontSize: '1rem',
              }),
            }}
          />
        </div>
        <div>
          <label className="block mb-2 text-lg font-medium text-gray-700">Fechas disponibles:</label>
          <div className="calendar-container w-full">
            <DatePicker
              selected={null}
              onChange={handleDateChange}
              highlightDates={selectedDates}
              inline
              multiple
              renderCustomHeader={CustomHeader}
              locale={es}
              calendarClassName="custom-calendar full-width-calendar"
              disabled={!selectedMember}
            />
          </div>
        </div>
        <div className="text-center">
          <span className="text-lg text-gray-600">
            {selectedDates.length} {selectedDates.length === 1 ? 'día' : 'días'} seleccionados
          </span>
        </div>
      </div>
    </div>
  );
};

export default MemberAvailabilityInput;