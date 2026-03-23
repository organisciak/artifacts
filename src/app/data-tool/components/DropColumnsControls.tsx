import React from 'react';

const DropColumnsControls = ({
  columns,
  columnsToRemove,
  toggleColumnRemoval,
  applyTransformation
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-md font-medium mb-3">Remove Columns</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select columns to remove</label>
          <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-2">
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
          
          <div className="mt-4">
            <button
              onClick={applyTransformation}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Apply Column Removal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropColumnsControls; 