import React from 'react';

const PseudonymizationControls = ({
  columns,
  columnsToAnonymize,
  toggleColumnAnonymization,
  columnAnonymizationTypes,
  updateAnonymizationType,
  columnsToRemove,
  toggleColumnRemoval
}) => {
  return (
    <div className="space-y-6">
      {/* Pseudonymization Section */}
      <div>
        <h3 className="text-md font-medium mb-3">Pseudonymize Data</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select columns to pseudonymize</label>
          <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-2">
            {columns.map(column => (
              <div key={`anon-${column}`} className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id={`anon-${column}`}
                  value={column}
                  checked={columnsToAnonymize.includes(column)}
                  onChange={(e) => toggleColumnAnonymization(column, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`anon-${column}`} className="ml-2 block text-sm text-gray-900">
                  {column}
                </label>
                
                {columnsToAnonymize.includes(column) && (
                  <select
                    value={columnAnonymizationTypes[column] || 'fullName'}
                    onChange={(e) => updateAnonymizationType(column, e.target.value)}
                    className="ml-4 p-1 text-xs border border-gray-300 rounded-md"
                  >
                    <option value="fullName">Full Name</option>
                    <option value="firstName">First Name</option>
                    <option value="lastName">Last Name</option>
                    <option value="username">Username</option>
                  </select>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Each unique value in the selected columns will be replaced with a pseudonym of the specified type.
          </p>
        </div>
      </div>
      
      {/* Column Removal Section */}
      <div>
        <h3 className="text-md font-medium mb-3">Remove Columns</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select columns to remove</label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            {columns.map(column => (
              <div key={`remove-${column}`} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`remove-${column}`}
                  value={column}
                  checked={columnsToRemove.includes(column)}
                  onChange={(e) => toggleColumnRemoval(column, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`remove-${column}`} className="ml-2 block text-sm text-gray-900">
                  {column}
                </label>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Selected columns will be completely removed from the output dataset.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PseudonymizationControls; 