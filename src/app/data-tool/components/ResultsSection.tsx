import React from 'react';
import DataTable from './DataTable';

const ResultsSection = ({ 
  transformedData, 
  transformedView, 
  setTransformedView, 
  exportCSV,
  // Add pseudonymization props
  transformationType,
  mappingData,
  exportMapping,
  columnAnonymizationTypes
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Transformed Data</h2>
        <div className="flex space-x-2">
          <select
            value={transformedView}
            onChange={(e) => setTransformedView(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"
          >
            <option value="table">Table View</option>
            <option value="json">JSON View</option>
          </select>
          <button 
            onClick={exportCSV}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
          {transformationType === 'pseudonymize' && Object.keys(mappingData).length > 0 && (
            <button 
              onClick={exportMapping}
              className="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
            >
              Export Mapping
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-2">
          {transformedData.length} rows in result
        </p>
        
        {transformedView === 'table' ? (
          <DataTable data={transformedData} />
        ) : (
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(transformedData, null, 2)}
          </pre>
        )}
      </div>
      
      {/* Mapping Table for Pseudonymization */}
      {transformationType === 'pseudonymize' && Object.keys(mappingData).length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">Pseudonym Mapping Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pseudonym
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(mappingData).flatMap(([column, values], colIndex) => 
                  Object.entries(values).slice(0, 3).map(([original, pseudonym], valIndex) => (
                    <tr key={`${colIndex}-${valIndex}`}>
                      <td className="px-6 py-4 whitespace-nowrap">{column}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {columnAnonymizationTypes[column] === 'fullName' ? 'Full Name' : 
                         columnAnonymizationTypes[column] === 'firstName' ? 'First Name' : 
                         columnAnonymizationTypes[column] === 'lastName' ? 'Last Name' : 
                         columnAnonymizationTypes[column] === 'username' ? 'Username' : columnAnonymizationTypes[column]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{original}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{pseudonym}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="text-sm text-gray-500 mt-2">
              Showing preview of mapping data. Export the full mapping as JSON.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsSection; 