import React from 'react';

const ClusteringControls = ({
  columns,
  selectedColumn,
  setSelectedColumn,
  clusteringMethod,
  setClusteringMethod,
  keyingFunction,
  setKeyingFunction,
  threshold,
  setThreshold,
  clusters = [],
  selectedClusters,
  toggleClusterSelection,
  normalizedValues,
  handleNormalizedValueChange,
  applyClusterChanges,
  isProcessing,
  processedCount,
  totalToProcess
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Column to Cluster</label>
          <select 
            value={selectedColumn} 
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="border p-2 rounded w-full"
          >
            {columns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <select 
            value={clusteringMethod} 
            onChange={(e) => setClusteringMethod(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="fingerprint">Key collision</option>
            <option value="ngram-fingerprint">N-Gram Fingerprint</option>
            <option value="metaphone">Phonetic fingerprint</option>
            <option value="levenshtein">Nearest neighbor</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Keying function</label>
          <select 
            value={keyingFunction} 
            onChange={(e) => setKeyingFunction(e.target.value)}
            className="border p-2 rounded w-full"
            disabled={clusteringMethod !== 'metaphone'}
          >
            <option value="metaphone">Metaphone</option>
            <option value="double-metaphone">Double Metaphone</option>
          </select>
        </div>
      </div>
      
      {clusteringMethod === 'levenshtein' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Similarity Threshold: {threshold}
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05" 
            value={threshold} 
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low Similarity (0.1)</span>
            <span>High Similarity (1.0)</span>
          </div>
        </div>
      )}
      
      {isProcessing && (
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${Math.round((processedCount / totalToProcess) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Processing {processedCount} of {totalToProcess} values...
          </p>
        </div>
      )}
      
      {clusters && clusters.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-medium">Clustering Results</h3>
            <button 
              onClick={applyClusterChanges}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              disabled={Object.values(selectedClusters).filter(Boolean).length === 0}
            >
              Apply Selected Changes
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Found {clusters.length} clusters with multiple values. Select clusters to merge and edit the normalized values if needed.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Cluster size</th>
                  <th className="px-4 py-2 text-left">Values in cluster</th>
                  <th className="px-4 py-2 text-center">Merge?</th>
                  <th className="px-4 py-2 text-left">New value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clusters.map((cluster, index) => {
                  // Use the first value as default normalized value if not set
                  const normalizedValue = normalizedValues[index] !== undefined ? 
                    normalizedValues[index] : cluster.values[0];
                  
                  return (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-4 py-3">{cluster.values.length}</td>
                      <td className="px-4 py-3">
                        <ul className="list-disc pl-5">
                          {cluster.values.map((value, vIndex) => (
                            <li key={vIndex} className="text-blue-600">{value}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedClusters[index] || false}
                          onChange={() => toggleClusterSelection(index)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={normalizedValue}
                          onChange={(e) => handleNormalizedValueChange(index, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusteringControls; 