import React from 'react';
import { ChevronDown } from 'lucide-react';

const BandSelector = ({ bands, selectedBand, setSelectedBand }) => {
  return (
    <div className="mb-8">
      <label htmlFor="band-select" className="block text-sm font-medium text-gray-700 mb-2">
        Seleccionar Banda:
      </label>
      <div className="relative">
        <select
          id="band-select"
          value={selectedBand ? selectedBand.id : ''}
          onChange={(e) => setSelectedBand(bands.find(band => band.id === e.target.value))}
          className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-indigo-500"
        >
          <option value="">Selecciona una banda</option>
          {bands.map((band) => (
            <option key={band.id} value={band.id}>
              {band.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <ChevronDown size={20} />
        </div>
      </div>
    </div>
  );
};

export default BandSelector;