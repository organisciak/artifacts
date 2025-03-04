import React from 'react';
import DataTable from './DataTable';

const FileUploadSection = ({ handleFileUpload, fileName, dataPreview }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-4">Upload CSV File</h2>
      <div className="flex items-center space-x-3">
        <label className="block">
          <span className="sr-only">Choose CSV file</span>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </label>
        <span className="text-sm text-gray-500">
          {fileName ? fileName : 'No file selected'}
        </span>
      </div>
      
      {/* Data Preview */}
      {dataPreview && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview (First 5 rows)</h3>
          <DataTable data={dataPreview} />
        </div>
      )}
    </div>
  );
};

export default FileUploadSection; 