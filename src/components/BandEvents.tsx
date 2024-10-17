import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { format, parseISO, isValid, startOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Trash, Plus, FileText, Users, Music } from 'lucide-react';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import { getDocs, getDoc } from '../utils/firebaseUtils';

// Define el tipo para los elementos de availableDates
type AvailableDate = {
  value: string;
  label: string;
  availableMembers: string[];
};

// Define el tipo para los eventos
type Event = {
  id: string;
  date: string;
  title: string;
  time?: string;
  notes?: string;
  members: string[];
};

const BandEvents = ({ db, selectedBand }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [newEvent, setNewEvent] = useState({ date: '', title: '', time: '', notes: '', members: [] });
  const [memberDetails, setMemberDetails] = useState({});

  useEffect(() => {
    const fetchEventsAndAvailableDates = async () => {
      if (selectedBand) {
        // Fetch events
        const eventsRef = collection(db, 'bands', selectedBand.id, 'events');
        const snapshot = await getDocs(eventsRef);
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(eventsData);

        // Fetch member details
        const memberDetailsObj = {};
        const fetchMemberDetails = async (memberId) => {
          const memberDoc = await getDoc(doc(db, 'members', memberId));
          if (memberDoc.exists()) {
            memberDetailsObj[memberId] = memberDoc.data();
          }
        };

        const allMembers = [...selectedBand.members, ...(selectedBand.substitutes || [])];
        await Promise.all(allMembers.map(member => fetchMemberDetails(member.id)));
        setMemberDetails(memberDetailsObj);

        // Fetch available dates
        const availableDates = [];
        const today = startOfDay(new Date());
        
        // Fetch availability for all members
        const membersAvailability = {};
        for (const member of allMembers) {
          const memberRef = collection(db, 'members', member.id, 'availability');
          const snapshot = await getDocs(memberRef);
          membersAvailability[member.id] = snapshot.docs.map(doc => doc.id);
        }

        // Calculate band availability
        const allDates = [...new Set(Object.values(membersAvailability).flat())];
        allDates.forEach(date => {
          const parsedDate = parseISO(date);
          if (isBefore(parsedDate, today)) return;

          const availableMembers = selectedBand.members.filter(member => 
            membersAvailability[member.id].includes(date)
          );

          const unavailableInstruments = selectedBand.members
            .filter(member => !membersAvailability[member.id].includes(date))
            .map(member => member.instruments)
            .flat();

          const availableSubstitutes = (selectedBand.substitutes || [])
            .filter(sub => membersAvailability[sub.id].includes(date));

          const allInstrumentsCovered = unavailableInstruments.every(instrument => 
            availableSubstitutes.some(sub => sub.instruments.includes(instrument))
          );

          if (availableMembers.length === selectedBand.members.length || allInstrumentsCovered) {
            availableDates.push({
              value: date,
              label: format(parsedDate, 'dd/MM/yyyy', { locale: es }),
              availableMembers: [...availableMembers, ...availableSubstitutes].map(m => m.id)
            });
          }
        });

        // Filter out dates that already have events
        const datesWithEvents = new Set(eventsData.map(event => event.date));
        const filteredAvailableDates = availableDates.filter(date => !datesWithEvents.has(date.value));

        setAvailableDates(filteredAvailableDates);
      }
    };

    fetchEventsAndAvailableDates();
  }, [db, selectedBand, events]); // Añade 'events' como dependencia

  const handleDeleteEvent = async (eventId) => {
    if (selectedBand) {
      const eventRef = doc(db, 'bands', selectedBand.id, 'events', eventId);
      await deleteDoc(eventRef);
      setEvents(events.filter(event => event.id !== eventId));
      
      // Asegúrate de que deletedEvent sea del tipo Event
      const deletedEvent: Event | undefined = events.find(event => event.id === eventId);
      if (deletedEvent) {
        const parsedDate = parseISO(deletedEvent.date);
        setAvailableDates(prevDates => [
          ...prevDates,
          {
            value: deletedEvent.date,
            label: format(parsedDate, 'dd/MM/yyyy', { locale: es }),
            availableMembers: deletedEvent.members || []
          }
        ]);
      }
    }
  };

  const generateEventId = (date: string, title: string): string => {
    const formattedDate = format(parseISO(date), 'yyyy-MM-dd');
    const formattedTitle = title.replace(/\s+/g, '');
    return `${formattedDate}_${formattedTitle}`;
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (selectedBand && newEvent.date && newEvent.title) {
      const eventId = generateEventId(newEvent.date, newEvent.title);
      const selectedDate = availableDates.find(date => date.value === newEvent.date);
      const eventWithMembers = {
        ...newEvent,
        members: selectedDate ? selectedDate.availableMembers : []
      };
      const eventRef = doc(db, 'bands', selectedBand.id, 'events', eventId);
      await setDoc(eventRef, eventWithMembers);
      setEvents([...events, { id: eventId, ...eventWithMembers }]);
      
      // Remove the selected date from available dates
      setAvailableDates(prevDates => prevDates.filter(date => date.value !== newEvent.date));
      
      setNewEvent({ date: '', title: '', time: '', notes: '', members: [] });
    }
  };

  const formatEventDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return 'Fecha no disponible';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: es }) : 'Fecha inválida';
  };

  const renderMemberInfo = (memberId) => {
    const member = memberDetails[memberId];
    if (!member) return null;
    return (
      <li key={memberId} className="flex items-center text-sm text-gray-600">
        <Users size={14} className="mr-2" />
        <span>{member.name}</span>
        <Music size={14} className="ml-2 mr-1" />
        <span>{member.instruments.join(', ')}</span>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {/* Event Creation Form */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Plus className="mr-2" size={20} />
          Agregar Nuevo Evento MADAFAKA
        </h2>
        <form onSubmit={handleAddEvent}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <Select
                options={availableDates}
                value={availableDates.find(date => date.value === newEvent.date)}
                onChange={(selected) => setNewEvent({ ...newEvent, date: selected.value })}
                placeholder="Seleccionar fecha"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del Evento</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Ingrese el título"
                className="w-full p-2 border rounded text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                value={newEvent.notes}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                placeholder="Notas adicionales"
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 transition flex items-center justify-center"
          >
            <Plus className="mr-2" size={16} />
            Agregar Evento
          </button>
        </form>
      </div>

      {/* Event Listing */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="mr-2" size={20} />
          Eventos de la Banda
        </h2>
        {events.length > 0 ? (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-lg">{event.title}</h4>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <Calendar size={14} className="mr-2" />
                      {formatEventDate(event.date)}
                      {event.time && (
                        <>
                          <Clock size={14} className="ml-4 mr-2" />
                          {event.time}
                        </>
                      )}
                    </p>
                    {event.notes && (
                      <p className="text-sm text-gray-600 mt-2 flex items-start">
                        <FileText size={14} className="mr-2 mt-1 flex-shrink-0" />
                        <span>{event.notes}</span>
                      </p>
                    )}
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Miembros disponibles:</p>
                      <ul className="mt-1 space-y-1">
                        {event.members.map(renderMemberInfo)}
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No hay eventos programados.</p>
        )}
      </div>
    </div>
  );
};

export default BandEvents;
