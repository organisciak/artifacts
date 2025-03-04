import { useState } from 'react';
import Papa from 'papaparse';

export const useCSVData = () => {
  const [csvData, setCsvData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState([]);
  const [dataPreview, setDataPreview] = useState(null);

  // Process file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data;
          setCsvData(data);
          
          // Extract column names
          if (data.length > 0) {
            const cols = Object.keys(data[0]);
            setColumns(cols);
          }
          
          // Generate data preview for immediate feedback
          setDataPreview(data.slice(0, 5));
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV file. Please check the file format.');
        }
      });
    }
  };

  return {
    csvData,
    columns,
    fileName,
    dataPreview,
    handleFileUpload
  };
}; 