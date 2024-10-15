import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Check, X, User, UserCheck } from 'lucide-react';

// Define el tipo para los miembros
type BandMember = {
  id: string;
  instruments: string[];
};

const AvailabilityCalendar = ({ db, selectedBand }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [bandAvailability, setBandAvailability] = useState<Record<string, { isAvailable: boolean; availableMembers: any[]; availableSubstitutes: any[] }>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedBand) return;

    const fetchAndCalculateAvailability = async () => {
      const membersAvailability: Record<string, string[]> = {};
      const names: Record<string, string | null> = {};

      // Fetch regular members' and substitutes' availability
      const fetchMemberAvailability = async (member) => {
        const memberRef = collection(db, 'members', member.id, 'availability');
        const snapshot = await getDocs(memberRef);
        return snapshot.docs.map(doc => doc.id);
      };

      // Fetch member names
      const fetchMemberName = async (memberId) => {
        const memberRef = collection(db, 'members');
        const memberDoc = await getDocs(query(memberRef, where('__name__', '==', memberId)));
        if (!memberDoc.empty) {
          return memberDoc.docs[0].data().name;
        }
        return null;
      };

      for (const member of [...selectedBand.members, ...(selectedBand.substitutes || [])]) {
        membersAvailability[member.id] = await fetchMemberAvailability(member);
        names[member.id] = await fetchMemberName(member.id);
      }

      setAvailability(membersAvailability);
      setMemberNames(names);

      // Calculate band availability
      const allDates = Object.values(membersAvailability).flat();
      const uniqueDates = [...new Set(allDates)];

      uniqueDates.forEach(date => {
        const availableMembers = selectedBand.members.filter(member => 
          membersAvailability[member.id].includes(date)
        );

        const unavailableInstruments = selectedBand.members
          .filter((member: BandMember) => 
            !membersAvailability[member.id].includes(date)
          )
          .map((member: BandMember) => member.instruments)
          .flat();

        const availableSubstitutes = (selectedBand.substitutes || [])
          .filter((sub: BandMember) => membersAvailability[sub.id].includes(date));

        const allInstrumentsCovered = unavailableInstruments.every((instrument: string) => 
          availableSubstitutes.some((sub: BandMember) => sub.instruments.includes(instrument))
        );

        bandAvailability[date] = {
          isAvailable: availableMembers.length === selectedBand.members.length || allInstrumentsCovered,
          availableMembers: availableMembers,
          availableSubstitutes: availableSubstitutes,
        };
      });

      setBandAvailability(bandAvailability);
    };

    fetchAndCalculateAvailability();

    // Set up real-time listener for changes in member availability
    const unsubscribes: (() => void)[] = [];
    [...selectedBand.members, ...(selectedBand.substitutes || [])].forEach(member => {
      const memberRef = collection(db, 'members', member.id, 'availability');
      const unsubscribe = onSnapshot(memberRef, () => {
        fetchAndCalculateAvailability();
      });
      unsubscribes.push(unsubscribe);
    });

    // Cleanup function to unsubscribe from all listeners
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [db, selectedBand, currentMonth]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const nextMonth = () => setCurrentMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1));

  const renderMemberAvailability = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dateAvailability = bandAvailability[dateKey];

    if (!dateAvailability) return null;

    const renderMember = (member: { id: string }, isSubstitute = false) => {
      const memberName = memberNames[member.id] || 'Unknown';
      const initial = memberName.charAt(0).toUpperCase() + memberName.slice(1, 2).toLowerCase();

      return (
        <div 
          key={member.id}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            isSubstitute ? 'bg-yellow-300 text-yellow-800' : 'bg-blue-300 text-blue-800'
          }`}
          title={`${memberName} (${isSubstitute ? 'Sustituto' : 'Miembro'}): Disponible`}
        >
          {initial}
        </div>
      );
    };

    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {dateAvailability.availableMembers.map(member => renderMember(member))}
        {dateAvailability.availableSubstitutes.map(sub => renderMember(sub, true))}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-semibold mb-4 flex items-center">
        <Calendar className="mr-2" />
        Calendario de Disponibilidad
      </h2>
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft /></button>
        <h3 className="text-xl font-medium">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded"><ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500">{day}</div>
        ))}
        {daysInMonth.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dateAvailability = bandAvailability[dateKey];
          return (
            <div
              key={dateKey}
              className={`p-2 border ${
                dateAvailability?.isAvailable ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{format(day, 'd')}</span>
                {dateAvailability?.isAvailable ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <X size={16} className="text-red-500" />
                )}
              </div>
              {renderMemberAvailability(day)}
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <h4 className="font-medium mb-2">Leyenda:</h4>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 mr-2"></div>
            <span>Banda disponible</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 mr-2"></div>
            <span>Banda no disponible</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-blue-300 flex items-center justify-center text-xs font-bold text-blue-800 mr-2">A</div>
            <span>Miembro disponible</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-yellow-300 flex items-center justify-center text-xs font-bold text-yellow-800 mr-2">S</div>
            <span>Sustituto disponible</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
