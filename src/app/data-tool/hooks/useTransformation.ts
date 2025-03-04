import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

export const useTransformation = (csvData, fileName, columns) => {
  const [transformedData, setTransformedData] = useState(null);
  const [workingData, setWorkingData] = useState(null); // Current working dataset
  const [transformationStack, setTransformationStack] = useState([]); // Track transformations
  const [currentStackIndex, setCurrentStackIndex] = useState(-1); // Current position in stack
  const [transformationType, setTransformationType] = useState('filter');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [groupByColumn, setGroupByColumn] = useState('');
  const [aggregateColumn, setAggregateColumn] = useState('');
  const [aggregateFunction, setAggregateFunction] = useState('sum');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [transformedView, setTransformedView] = useState('table');
  const [columnsToAnonymize, setColumnsToAnonymize] = useState([]);
  const [columnAnonymizationTypes, setColumnAnonymizationTypes] = useState({});
  const [columnsToRemove, setColumnsToRemove] = useState([]);
  const [mappingData, setMappingData] = useState({});
  
  // Hash ID generator states
  const [selectedHashColumns, setSelectedHashColumns] = useState([]);
  const [idColumnName, setIdColumnName] = useState('hash_id');
  const [useAutoColumnName, setUseAutoColumnName] = useState(true);
  const [hashAlgorithm, setHashAlgorithm] = useState('simple');
  const [useSalt, setUseSalt] = useState(false);
  const [saltValue, setSaltValue] = useState('');

  // Add clustering states
  const [clusteringMethod, setClusteringMethod] = useState('fingerprint');
  const [keyingFunction, setKeyingFunction] = useState('metaphone');
  const [clusters, setClusters] = useState([]);
  const [threshold, setThreshold] = useState(0.7);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [selectedClusters, setSelectedClusters] = useState({});
  const [normalizedValues, setNormalizedValues] = useState({});
  
  const firstNames = [
    'Alex', 'Bailey', 'Cameron', 'Dakota', 'Ellis', 'Finley', 'Gray', 'Harper',
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  ];
  
  const usernamePrefixes = [
    'cool', 'super', 'awesome', 'happy', 'clever', 'bright', 'swift', 'ninja',
  ];
  
  const usernameSuffixes = [
    'user', 'gamer', 'coder', 'dev', 'guru', 'wizard', 'star', 'geek',
  ];

  const generatePseudonym = (type, index) => {
    const shuffledFirstNames = _.shuffle([...firstNames]);
    const shuffledLastNames = _.shuffle([...lastNames]);
    const shuffledPrefixes = _.shuffle([...usernamePrefixes]);
    const shuffledSuffixes = _.shuffle([...usernameSuffixes]);
    
    const firstNameIndex = index % shuffledFirstNames.length;
    const lastNameIndex = Math.floor(index / shuffledFirstNames.length) % shuffledLastNames.length;
    const prefixIndex = index % shuffledPrefixes.length;
    const suffixIndex = Math.floor(index / shuffledPrefixes.length) % shuffledSuffixes.length;
    const numberSuffix = Math.floor(Math.random() * 1000);
    
    switch(type) {
      case 'fullName':
        return `${shuffledFirstNames[firstNameIndex]} ${shuffledLastNames[lastNameIndex]}`;
      case 'firstName':
        return shuffledFirstNames[firstNameIndex];
      case 'lastName':
        return shuffledLastNames[lastNameIndex];
      case 'username':
        return `${shuffledPrefixes[prefixIndex]}${shuffledSuffixes[suffixIndex]}${numberSuffix}`;
      default:
        return `${shuffledFirstNames[firstNameIndex]} ${shuffledLastNames[lastNameIndex]}`;
    }
  };

  const toggleColumnAnonymization = (column, checked) => {
    if (checked) {
      setColumnsToAnonymize([...columnsToAnonymize, column]);
      setColumnAnonymizationTypes({
        ...columnAnonymizationTypes,
        [column]: 'fullName'
      });
    } else {
      setColumnsToAnonymize(columnsToAnonymize.filter(col => col !== column));
      const newTypes = {...columnAnonymizationTypes};
      delete newTypes[column];
      setColumnAnonymizationTypes(newTypes);
    }
  };

  const toggleColumnRemoval = (column, checked) => {
    if (checked) {
      setColumnsToRemove([...columnsToRemove, column]);
    } else {
      setColumnsToRemove(columnsToRemove.filter(col => col !== column));
    }
  };

  const updateAnonymizationType = (column, type) => {
    setColumnAnonymizationTypes({
      ...columnAnonymizationTypes,
      [column]: type
    });
  };

  const exportMapping = () => {
    if (Object.keys(mappingData).length === 0) return;
    
    const json = JSON.stringify(mappingData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `mapping_${fileName.replace('.csv', '.json')}`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (columns.length > 0 && csvData?.length > 0) {
      setFilterColumn(columns[0]);
      setGroupByColumn(columns[0]);
      setAggregateColumn(columns.find(col => typeof csvData[0][col] === 'number') || columns[0]);
      setSortColumn(columns[0]);
    }
  }, [columns, csvData]);

  // Initialize working data when CSV is loaded
  useEffect(() => {
    if (csvData && csvData.length > 0) {
      setWorkingData(csvData);
      setTransformationStack([]);
      setCurrentStackIndex(-1);
      setTransformedData(csvData);
    }
  }, [csvData]);

  // Generate a simple hash from string
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  };
  
  // SHA-like hash simulation (for demonstration - not cryptographically secure)
  const shaLikeHash = (str) => {
    let hash = '';
    const input = str + new Date().getTime().toString(); // Add timestamp for more uniqueness
    
    // Create a longer hash by combining multiple simple hashes
    for (let i = 0; i < 4; i++) {
      hash += simpleHash(input + i);
    }
    
    return hash.substring(0, 10);
  };

  // Generate hash based on selected columns
  const generateHash = (row) => {
    if (selectedHashColumns.length === 0) return '';
    
    // Combine values of selected columns
    let combinedValue = selectedHashColumns
      .map(col => row[col] !== null && row[col] !== undefined ? String(row[col]) : '')
      .join('|');
    
    // Add salt if enabled
    if (useSalt && saltValue) {
      combinedValue = combinedValue + '|' + saltValue;
    }
    
    // Apply selected hash algorithm
    return hashAlgorithm === 'simple' 
      ? simpleHash(combinedValue) 
      : shaLikeHash(combinedValue);
  };

  // Get auto-generated column name based on selected columns
  const getAutoColumnName = () => {
    if (selectedHashColumns.length === 0) return 'hash_id';
    
    if (selectedHashColumns.length <= 3) {
      // If we have 3 or fewer columns, use all of them in the name
      return selectedHashColumns.join('_') + '_hash';
    } else {
      // If we have more than 3 columns, use the first 2 and indicate total count
      return `${selectedHashColumns[0]}_${selectedHashColumns[1]}_plus${selectedHashColumns.length - 2}_hash`;
    }
  };

  // Toggle column selection for hash ID generation
  const toggleHashColumnSelection = (column) => {
    setSelectedHashColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        return [...prev, column];
      }
    });
  };

  // Add clustering methods from the CSV clustering app
  
  // Fingerprint method
  const fingerprintKey = (str) => {
    if (str === null || str === undefined) return '';
    
    return String(str)
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove all non-word chars
      .split(/\s+/) // Split on whitespace
      .filter(word => word.length > 0) // Remove empty strings
      .sort() // Sort words alphabetically
      .filter((word, i, arr) => i === 0 || word !== arr[i-1]) // Remove duplicates
      .join(' ');
  };
  
  // NGram fingerprint
  const createNGrams = (str, n) => {
    if (!str || n < 1) return [];
    
    const normalizedStr = String(str)
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
      
    if (normalizedStr.length < n) return [normalizedStr];
    
    const ngrams = [];
    for (let i = 0; i <= normalizedStr.length - n; i++) {
      ngrams.push(normalizedStr.slice(i, i + n));
    }
    
    return ngrams;
  };
  
  const ngramFingerprint = (str, n = 2) => {
    if (str === null || str === undefined) return '';
    
    const ngrams = createNGrams(str, n);
    return ngrams.sort().join(' ');
  };
  
  // Metaphone phonetic algorithm
  const metaphoneKey = (str) => {
    if (str === null || str === undefined) return '';
    
    // Convert to uppercase
    let word = String(str).toUpperCase();
    
    // Replace specific character sequences
    word = word.replace(/([^A-Z])/g, '') // Remove non-alphabetic characters
                .replace(/^KN|^GN|^PN|^PS|^AE/g, 'N') // Initial KN, GN, PN, PS, AE -> N
                .replace(/^WR/g, 'R') // Initial WR -> R
                .replace(/^X/g, 'S') // Initial X -> S
                .replace(/^WH/g, 'W') // Initial WH -> W
                .replace(/MB$/g, 'M') // Final MB -> M
                .replace(/SCH/g, 'SK') // SCH -> SK
                .replace(/TH/g, '0') // TH -> 0 (zero)
                .replace(/PH/g, 'F') // PH -> F
                .replace(/([DFLT])CH/g, '$1K') // CH after D, F, L, T -> K
                .replace(/CH/g, 'X') // CH -> X (like SH)
                .replace(/C([EIY])/g, 'S$1') // C before E, I, Y -> S
                .replace(/C/g, 'K') // All other C -> K
                .replace(/Q/g, 'K') // Q -> K
                .replace(/V/g, 'F') // V -> F
                .replace(/WA/g, 'W2') // WA -> W2
                .replace(/WO/g, 'W2') // WO -> W2
                .replace(/W/g, 'W') // W -> W
                .replace(/X/g, 'KS') // X -> KS
                .replace(/Y([AEIOU])/g, 'Y$1') // Y followed by vowel
                .replace(/Z/g, 'S') // Z -> S
                .replace(/GH/g, 'H') // GH -> H
                .replace(/G([EIY])/g, 'J$1') // G before E, I, Y -> J
                .replace(/G/g, 'K') // All other G -> K
                .replace(/A|E|I|O|U/g, 'A') // All vowels to A
                .replace(/[AEIOU]/g, '') // Remove all vowels
                .replace(/(.)\1+/g, '$1'); // Remove consecutive duplicates
    
    // Truncate to first 6 characters
    if (word.length > 6) {
      word = word.substring(0, 6);
    }
    
    return word;
  };
  
  // Double metaphone (simplified)
  const doubleMetaphoneKey = (str) => {
    // Using simple metaphone for the implementation
    return metaphoneKey(str);
  };
  
  // Levenshtein distance
  const levenshteinDistance = (s1, s2) => {
    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1.charAt(i - 1) === s2.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[s1.length][s2.length];
  };
  
  // Clustering implementations
  const fingerprintClustering = (values) => {
    const clusterMap = {};
    
    values.forEach((value, index) => {
      const key = fingerprintKey(value);
      if (!clusterMap[key]) {
        clusterMap[key] = [];
      }
      clusterMap[key].push(value);
      
      setProcessedCount(index + 1);
    });
    
    return Object.keys(clusterMap).map(key => ({
      key,
      values: clusterMap[key],
      count: clusterMap[key].length
    }));
  };
  
  const ngramClustering = (values) => {
    const clusterMap = {};
    
    values.forEach((value, index) => {
      const key = ngramFingerprint(value, 2); // Using bigrams
      if (!clusterMap[key]) {
        clusterMap[key] = [];
      }
      clusterMap[key].push(value);
      
      setProcessedCount(index + 1);
    });
    
    return Object.keys(clusterMap).map(key => ({
      key,
      values: clusterMap[key],
      count: clusterMap[key].length
    }));
  };
  
  const metaphoneClustering = (values) => {
    const clusterMap = {};
    
    values.forEach((value, index) => {
      const key = keyingFunction === 'metaphone' ? 
        metaphoneKey(value) : doubleMetaphoneKey(value);
      
      if (!clusterMap[key]) {
        clusterMap[key] = [];
      }
      clusterMap[key].push(value);
      
      setProcessedCount(index + 1);
    });
    
    return Object.keys(clusterMap).map(key => ({
      key,
      values: clusterMap[key],
      count: clusterMap[key].length
    }));
  };
  
  const levenshteinClustering = (values) => {
    const clusters = [];
    const assigned = new Set();
    
    for (let i = 0; i < values.length; i++) {
      if (assigned.has(i)) continue;
      
      const current = values[i];
      const cluster = [current];
      assigned.add(i);
      
      for (let j = i + 1; j < values.length; j++) {
        if (assigned.has(j)) continue;
        
        const candidate = values[j];
        const distance = levenshteinDistance(current, candidate);
        const maxLength = Math.max(current.length, candidate.length);
        const normalizedDistance = maxLength > 0 ? distance / maxLength : 0;
        
        if (1 - normalizedDistance >= threshold) {
          cluster.push(candidate);
          assigned.add(j);
        }
      }
      
      if (cluster.length > 1) {
        clusters.push({
          key: `cluster_${i}`,
          values: cluster,
          count: cluster.length
        });
      }
      
      setProcessedCount(i + 1);
    }
    
    return clusters;
  };
  
  // Toggle cluster selection
  const toggleClusterSelection = (clusterIndex) => {
    setSelectedClusters(prev => ({
      ...prev,
      [clusterIndex]: !prev[clusterIndex]
    }));
  };

  // Handle normalized value change
  const handleNormalizedValueChange = (clusterIndex, value) => {
    setNormalizedValues(prev => ({
      ...prev,
      [clusterIndex]: value
    }));
  };

  // Apply cluster changes to the data
  const applyClusterChanges = () => {
    if (!workingData) return;
    
    let updatedData = [...workingData];
    
    // Create a mapping from original values to normalized values
    const valueMapping = {};
    
    // First collect all mappings from all selected clusters
    Object.keys(selectedClusters).forEach(clusterIndex => {
      if (selectedClusters[clusterIndex]) {
        const index = parseInt(clusterIndex);
        const cluster = clusters[index];
        // Get the normalized value (user edited or default)
        const newValue = normalizedValues[index] !== undefined ? 
          normalizedValues[index] : cluster.values[0];
        
        // Add each value in this cluster to the mapping
        cluster.values.forEach(value => {
          valueMapping[value] = newValue;
        });
      }
    });
    
    // Then apply all mappings at once
    updatedData = updatedData.map(row => {
      const currentValue = String(row[filterColumn]);
      if (valueMapping[currentValue]) {
        return { ...row, [filterColumn]: valueMapping[currentValue] };
      }
      return row;
    });
    
    // Only update the transformed data
    setTransformedData(updatedData);
    // Don't change the view mode
    
    // Reset selections
    setSelectedClusters({});
    setNormalizedValues({});
    setClusters([]);
  };
  
  // Modified applyTransformation to use workingData instead of csvData
  const applyTransformation = () => {
    if (!workingData || workingData.length === 0) return;
    
    let result;
    
    switch (transformationType) {
      case 'filter':
        result = workingData.filter(row => {
          const value = row[filterColumn];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(filterValue.toLowerCase());
          }
          return String(value) === filterValue;
        });
        break;
        
      case 'groupBy':
        const grouped = _.groupBy(workingData, groupByColumn);
        
        result = Object.keys(grouped).map(key => {
          const group = grouped[key];
          const aggregated = { [groupByColumn]: key };
          
          if (aggregateFunction === 'sum') {
            aggregated[`${aggregateFunction}(${aggregateColumn})`] = 
              _.sumBy(group, row => parseFloat(row[aggregateColumn]) || 0);
          } else if (aggregateFunction === 'avg') {
            aggregated[`${aggregateFunction}(${aggregateColumn})`] = 
              _.meanBy(group, row => parseFloat(row[aggregateColumn]) || 0);
          } else if (aggregateFunction === 'min') {
            aggregated[`${aggregateFunction}(${aggregateColumn})`] = 
              _.minBy(group, row => parseFloat(row[aggregateColumn]) || 0)?.[aggregateColumn];
          } else if (aggregateFunction === 'max') {
            aggregated[`${aggregateFunction}(${aggregateColumn})`] = 
              _.maxBy(group, row => parseFloat(row[aggregateColumn]) || 0)?.[aggregateColumn];
          } else if (aggregateFunction === 'count') {
            aggregated[`${aggregateFunction}(${aggregateColumn})`] = group.length;
          }
          
          return aggregated;
        });
        break;
        
      case 'sort':
        result = _.orderBy(
          workingData, 
          [sortColumn], 
          [sortDirection]
        );
        break;
        
      case 'clean':
        result = workingData
          .filter(row => !Object.values(row).some(value => value === null || value === undefined || value === ''))
          .map(row => {
            const cleanedRow = {};
            Object.entries(row).forEach(([key, value]) => {
              if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                cleanedRow[key] = parseFloat(value);
              } else {
                cleanedRow[key] = value;
              }
            });
            return cleanedRow;
          });
        break;
        
      case 'pivot':
        if (groupByColumn && aggregateColumn) {
          const pivotData = {};
          const uniqueValues = new Set();
          
          workingData.forEach(row => {
            const groupKey = row[groupByColumn];
            uniqueValues.add(row[aggregateColumn]);
            
            if (!pivotData[groupKey]) {
              pivotData[groupKey] = {};
            }
            
            pivotData[groupKey][row[aggregateColumn]] = 
              (pivotData[groupKey][row[aggregateColumn]] || 0) + 1;
          });
          
          result = Object.keys(pivotData).map(key => {
            const resultRow = { [groupByColumn]: key };
            Array.from(uniqueValues).forEach(value => {
              resultRow[value] = pivotData[key][value] || 0;
            });
            return resultRow;
          });
        } else {
          result = workingData;
        }
        break;
        
      case 'pseudonymize':
        try {
          let transformedData = JSON.parse(JSON.stringify(workingData));
          const newMappingData = {};
          
          if (columnsToAnonymize.length > 0) {
            columnsToAnonymize.forEach(column => {
              const pseudonymType = columnAnonymizationTypes[column] || 'fullName';
              
              const uniqueValues = _.uniq(workingData.map(row => row[column]))
                .filter(value => value !== null && value !== undefined && value !== '');
              
              newMappingData[column] = {};
              
              uniqueValues.forEach((value, index) => {
                const pseudonym = generatePseudonym(pseudonymType, index);
                newMappingData[column][value] = pseudonym;
              });
            });
            
            transformedData = transformedData.map(row => {
              const newRow = {...row};
              columnsToAnonymize.forEach(column => {
                const originalValue = newRow[column];
                if (originalValue && newMappingData[column][originalValue]) {
                  newRow[column] = newMappingData[column][originalValue];
                }
              });
              return newRow;
            });
          }
          
          if (columnsToRemove.length > 0) {
            transformedData = transformedData.map(row => {
              const newRow = {...row};
              columnsToRemove.forEach(column => {
                delete newRow[column];
              });
              return newRow;
            });
          }
          
          setMappingData(newMappingData);
          result = transformedData;
        } catch (error) {
          console.error('Error during transformation:', error);
          result = workingData;
        }
        break;
        
      case 'hashId':
        if (selectedHashColumns.length === 0) {
          alert('Please select at least one column to generate the hash ID.');
          return;
        }
        
        // Use auto name or user-defined name
        const finalIdColumnName = useAutoColumnName ? getAutoColumnName() : idColumnName;
        
        result = workingData.map(row => {
          const newRow = { ...row };
          newRow[finalIdColumnName] = generateHash(row);
          return newRow;
        });
        break;
        
      case 'clustering':
        // Reset states
        setClusters([]);
        setSelectedClusters({});
        setNormalizedValues({});
        setIsProcessing(true);
        
        // Extract unique values from the selected column
        const values = workingData
          .map(row => row[filterColumn])
          .filter(val => val !== null && val !== undefined)
          .map(val => String(val));
        
        const uniqueValues = [...new Set(values)];
        setTotalToProcess(uniqueValues.length);
        
        // Use setTimeout to not block the UI
        setTimeout(() => {
          let clusterResults = [];
          
          if (clusteringMethod === 'fingerprint') {
            clusterResults = fingerprintClustering(uniqueValues);
          } else if (clusteringMethod === 'ngram-fingerprint') {
            clusterResults = ngramClustering(uniqueValues);
          } else if (clusteringMethod === 'metaphone') {
            clusterResults = metaphoneClustering(uniqueValues);
          } else if (clusteringMethod === 'levenshtein') {
            clusterResults = levenshteinClustering(uniqueValues);
          }
          
          // Filter clusters with more than one value
          const validClusters = clusterResults.filter(cluster => cluster.values.length > 1);
          
          // Sort clusters by size (descending)
          validClusters.sort((a, b) => b.values.length - a.values.length);
          
          setClusters(validClusters);
          setIsProcessing(false);
          setProcessedCount(0);
          
          // Don't set transformedData here, wait for user to apply changes
        }, 100);
        
        return; // Return early without setting transformedData
        
      case 'dropColumns':
        if (columnsToRemove.length > 0) {
          result = workingData.map(row => {
            const newRow = { ...row };
            columnsToRemove.forEach(col => {
              delete newRow[col];
            });
            return newRow;
          });
          
          // Reset the columnsToRemove after applying
          setColumnsToRemove([]);
        } else {
          result = workingData;
        }
        break;
        
      default:
        result = workingData;
    }
    
    // Add transformation to stack
    const newTransformation = {
      type: transformationType,
      params: getTransformationParams(),
      timestamp: new Date().toISOString()
    };
    
    // Update the transformation stack and current index
    const updatedStack = transformationStack.slice(0, currentStackIndex + 1);
    updatedStack.push(newTransformation);
    setTransformationStack(updatedStack);
    setCurrentStackIndex(currentStackIndex + 1);
    
    // Update both transformedData and workingData
    setTransformedData(result);
    setWorkingData(result);
  };

  // Helper to get params for current transformation
  const getTransformationParams = () => {
    switch (transformationType) {
      case 'filter':
        return { column: filterColumn, value: filterValue };
      case 'sort':
        return { column: sortColumn, direction: sortDirection };
      case 'groupBy':
        return { 
          groupBy: groupByColumn, 
          aggregate: aggregateColumn, 
          function: aggregateFunction 
        };
      // ... other transformation types ...
      default:
        return {};
    }
  };

  // Undo last transformation
  const undoTransformation = () => {
    if (currentStackIndex >= 0) {
      const newIndex = currentStackIndex - 1;
      setCurrentStackIndex(newIndex);
      
      if (newIndex === -1) {
        // If we've gone back before the first transformation, show original data
        setWorkingData(csvData);
        setTransformedData(csvData);
      } else {
        // Otherwise reapply transformations up to the new index
        reapplyTransformations(newIndex);
      }
    }
  };

  // Redo previously undone transformation
  const redoTransformation = () => {
    if (currentStackIndex < transformationStack.length - 1) {
      const newIndex = currentStackIndex + 1;
      setCurrentStackIndex(newIndex);
      reapplyTransformations(newIndex);
    }
  };

  // Reapply transformations up to given index
  const reapplyTransformations = (targetIndex) => {
    let currentData = csvData;
    
    // Apply all transformations up to target index
    for (let i = 0; i <= targetIndex; i++) {
      const transform = transformationStack[i];
      currentData = applyTransformationToData(currentData, transform);
    }
    
    setWorkingData(currentData);
    setTransformedData(currentData);
  };

  // Apply a specific transformation to data
  const applyTransformationToData = (data, transform) => {
    // Implementation would include similar logic to applyTransformation
    // but would use the parameters stored in the transform object
    // This is a simplified example
    switch (transform.type) {
      case 'filter':
        return data.filter(row => {
          const value = row[transform.params.column];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(transform.params.value.toLowerCase());
          }
          return String(value) === transform.params.value;
        });
      // ... other transformation types ...
      default:
        return data;
    }
  };

  const exportCSV = () => {
    if (!transformedData) return;
    
    const csv = Papa.unparse(transformedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transformed_${fileName}`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    transformedData,
    transformationType,
    filterColumn,
    filterValue,
    groupByColumn,
    aggregateColumn,
    aggregateFunction,
    sortColumn,
    sortDirection,
    transformedView,
    columnsToAnonymize,
    columnAnonymizationTypes,
    columnsToRemove,
    mappingData,
    selectedHashColumns,
    idColumnName,
    useAutoColumnName,
    hashAlgorithm,
    useSalt, 
    saltValue,
    toggleHashColumnSelection,
    setIdColumnName,
    setUseAutoColumnName,
    setHashAlgorithm,
    setUseSalt,
    setSaltValue,
    getAutoColumnName,
    toggleColumnAnonymization,
    toggleColumnRemoval,
    updateAnonymizationType,
    exportMapping,
    setTransformationType,
    setFilterColumn,
    setFilterValue,
    setGroupByColumn,
    setAggregateColumn,
    setAggregateFunction,
    setSortColumn,
    setSortDirection,
    setTransformedView,
    applyTransformation,
    exportCSV,
    clusteringMethod,
    setClusteringMethod,
    keyingFunction,
    setKeyingFunction,
    clusters,
    threshold,
    setThreshold,
    isProcessing,
    processedCount,
    totalToProcess,
    selectedClusters,
    normalizedValues,
    toggleClusterSelection,
    handleNormalizedValueChange,
    applyClusterChanges,
    workingData,
    transformationStack,
    currentStackIndex,
    undoTransformation,
    redoTransformation
  };
}; 