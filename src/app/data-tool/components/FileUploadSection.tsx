import React, { useRef } from 'react';
import { FileSpreadsheet as CsvIcon } from 'lucide-react';
import Papa from 'papaparse';

const FileUploadSection = ({ handleFileUpload, fileName, onColumnTransform }) => {
  const fileInputRef = useRef(null);

  const handleFileSelectClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data;
          // Pass parsed data to parent component
          handleFileUpload(data, file.name, Object.keys(data[0] || {}));
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          // Handle error here, maybe show an error message to the user
        }
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
      
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-grow">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50" onClick={handleFileSelectClick}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <CsvIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500 mb-1">Click to select a CSV file</p>
            <p className="text-xs text-gray-400">or drag and drop here</p>
          </div>
        </div>
        
        {fileName && (
          <div className="flex-grow md:w-1/2">
            <div className="border rounded-lg p-4 h-full">
              <h3 className="font-medium text-sm mb-2">File Information</h3>
              <div className="text-sm text-gray-600">
                <p><span className="font-medium">Filename:</span> {fileName}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadSection; 