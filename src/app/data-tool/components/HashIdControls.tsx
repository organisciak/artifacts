import React from 'react';

const HashIdControls = ({
  columns,
  selectedHashColumns,
  toggleHashColumnSelection,
  idColumnName,
  setIdColumnName,
  useAutoColumnName,
  setUseAutoColumnName,
  getAutoColumnName,
  hashAlgorithm,
  setHashAlgorithm,
  useSalt,
  setUseSalt,
  saltValue,
  setSaltValue
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">ID Column Name</label>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            id="auto-name-checkbox"
            checked={useAutoColumnName}
            onChange={(e) => setUseAutoColumnName(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="auto-name-checkbox" className="text-sm text-gray-700">
            Auto-generate name from selected columns
          </label>
        </div>
        <input
          type="text"
          value={useAutoColumnName && selectedHashColumns.length > 0 ? getAutoColumnName() : idColumnName}
          onChange={(e) => setIdColumnName(e.target.value)}
          disabled={useAutoColumnName && selectedHashColumns.length > 0}
          className={`p-2 border border-gray-300 rounded-md shadow-sm w-full sm:w-64 ${
            useAutoColumnName && selectedHashColumns.length > 0 ? 'bg-gray-100' : ''
          }`}
          placeholder="Enter ID column name"
        />
        {useAutoColumnName && selectedHashColumns.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Name will be based on selected columns
          </p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Hash Algorithm</label>
        <select
          value={hashAlgorithm}
          onChange={(e) => setHashAlgorithm(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm w-full sm:w-64"
        >
          <option value="simple">Simple Hash</option>
          <option value="complex">More Complex Hash</option>
        </select>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            id="use-salt-checkbox"
            checked={useSalt}
            onChange={(e) => setUseSalt(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="use-salt-checkbox" className="text-sm font-medium text-gray-700">
            Add salt to hash (makes hash unique but not reproducible)
          </label>
        </div>
        {useSalt && (
          <div className="mt-2 pl-6">
            <input
              type="text"
              value={saltValue}
              onChange={(e) => setSaltValue(e.target.value)}
              className="p-2 border border-gray-300 rounded-md shadow-sm w-full sm:w-64"
              placeholder="Enter salt value (secret key)"
            />
            <p className="text-xs text-gray-500 mt-1">
              The salt will be added to each row before hashing to increase security
            </p>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Columns for Hash Calculation
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {columns.map(column => (
              <div key={column} className="flex items-center">
                <input
                  type="checkbox"
                  id={`hashcol-${column}`}
                  checked={selectedHashColumns.includes(column)}
                  onChange={() => toggleHashColumnSelection(column)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor={`hashcol-${column}`} className="ml-2 text-sm text-gray-700">
                  {column}
                </label>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Selected: {selectedHashColumns.length} columns
        </p>
      </div>
    </div>
  );
};

export default HashIdControls; 