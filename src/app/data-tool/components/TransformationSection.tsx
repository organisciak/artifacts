import React from 'react';
import TransformationControls from './TransformationControls';

const TransformationSection = ({ 
  transformationType,
  setTransformationType,
  filterColumn,
  setFilterColumn,
  filterValue,
  setFilterValue,
  groupByColumn,
  setGroupByColumn,
  aggregateColumn,
  setAggregateColumn,
  aggregateFunction,
  setAggregateFunction,
  sortColumn,
  setSortColumn,
  sortDirection,
  setSortDirection,
  columns,
  applyTransformation,
  columnsToAnonymize,
  toggleColumnAnonymization,
  columnAnonymizationTypes,
  updateAnonymizationType,
  columnsToRemove,
  toggleColumnRemoval,
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
  setSaltValue,
  clusteringMethod,
  setClusteringMethod,
  keyingFunction,
  setKeyingFunction,
  clusters,
  threshold,
  setThreshold,
  normalizedValues,
  selectedClusters,
  toggleClusterSelection,
  handleNormalizedValueChange,
  applyClusterChanges,
  isProcessing,
  processedCount,
  totalToProcess
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-4">Transform Data</h2>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Transformation Type</label>
          <select 
            value={transformationType} 
            onChange={(e) => setTransformationType(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="filter">Filter Rows</option>
            <option value="groupBy">Group & Aggregate</option>
            <option value="sort">Sort Data</option>
            <option value="clean">Clean Data</option>
            <option value="pivot">Pivot Table</option>
            <option value="pseudonymize">Pseudonymize Data</option>
            <option value="hashId">Generate Hash IDs</option>
            <option value="clustering">Cluster & Edit Values</option>
          </select>
        </div>
        
        <div className="flex items-end">
          <button 
            onClick={applyTransformation}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {transformationType === 'clustering' ? 'Find Clusters' : 'Apply Transformation'}
          </button>
        </div>
      </div>
      
      <TransformationControls 
        transformationType={transformationType}
        filterColumn={filterColumn}
        setFilterColumn={setFilterColumn}
        filterValue={filterValue}
        setFilterValue={setFilterValue}
        groupByColumn={groupByColumn}
        setGroupByColumn={setGroupByColumn}
        aggregateColumn={aggregateColumn}
        setAggregateColumn={setAggregateColumn}
        aggregateFunction={aggregateFunction}
        setAggregateFunction={setAggregateFunction}
        sortColumn={sortColumn}
        setSortColumn={setSortColumn}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        columns={columns}
        columnsToAnonymize={columnsToAnonymize}
        toggleColumnAnonymization={toggleColumnAnonymization}
        columnAnonymizationTypes={columnAnonymizationTypes}
        updateAnonymizationType={updateAnonymizationType}
        columnsToRemove={columnsToRemove}
        toggleColumnRemoval={toggleColumnRemoval}
        selectedHashColumns={selectedHashColumns}
        toggleHashColumnSelection={toggleHashColumnSelection}
        idColumnName={idColumnName}
        setIdColumnName={setIdColumnName}
        useAutoColumnName={useAutoColumnName}
        setUseAutoColumnName={setUseAutoColumnName}
        getAutoColumnName={getAutoColumnName}
        hashAlgorithm={hashAlgorithm}
        setHashAlgorithm={setHashAlgorithm}
        useSalt={useSalt}
        setUseSalt={setUseSalt}
        saltValue={saltValue}
        setSaltValue={setSaltValue}
        clusteringMethod={clusteringMethod}
        setClusteringMethod={setClusteringMethod}
        keyingFunction={keyingFunction}
        setKeyingFunction={setKeyingFunction}
        clusters={clusters}
        threshold={threshold}
        setThreshold={setThreshold}
        normalizedValues={normalizedValues}
        selectedClusters={selectedClusters}
        toggleClusterSelection={toggleClusterSelection}
        handleNormalizedValueChange={handleNormalizedValueChange}
        applyClusterChanges={applyClusterChanges}
        isProcessing={isProcessing}
        processedCount={processedCount}
        totalToProcess={totalToProcess}
      />
    </div>
  );
};

export default TransformationSection; 