import React from 'react';
import PseudonymizationControls from './PseudonymizationControls';
import HashIdControls from './HashIdControls';
import ClusteringControls from './ClusteringControls';
import DropColumnsControls from './DropColumnsControls';

const TransformationControls = ({
  transformationType,
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
  // Add pseudonymization props
  columnsToAnonymize,
  toggleColumnAnonymization,
  columnAnonymizationTypes,
  updateAnonymizationType,
  columnsToRemove,
  toggleColumnRemoval,
  // Hash ID generator props
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
  // Add clustering props
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
  totalToProcess,
  applyTransformation
}) => {
  // Render column options for dropdowns
  const renderColumnOptions = () => {
    return columns.map(column => (
      <option key={column} value={column}>
        {column}
      </option>
    ));
  };

  const renderTransformationControls = () => {
    switch (transformationType) {
      case 'filter':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Column</label>
              <select 
                value={filterColumn} 
                onChange={(e) => setFilterColumn(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                {renderColumnOptions()}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Value Contains</label>
              <input 
                type="text" 
                value={filterValue} 
                onChange={(e) => setFilterValue(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="Filter value..."
              />
            </div>
          </div>
        );
        
      case 'groupBy':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Group By</label>
              <select 
                value={groupByColumn} 
                onChange={(e) => setGroupByColumn(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                {renderColumnOptions()}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aggregate Column</label>
              <select 
                value={aggregateColumn} 
                onChange={(e) => setAggregateColumn(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                {renderColumnOptions()}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Function</label>
              <select 
                value={aggregateFunction} 
                onChange={(e) => setAggregateFunction(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
                <option value="count">Count</option>
              </select>
            </div>
          </div>
        );
        
      case 'sort':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sort By</label>
              <select 
                value={sortColumn} 
                onChange={(e) => setSortColumn(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                {renderColumnOptions()}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Direction</label>
              <select 
                value={sortDirection} 
                onChange={(e) => setSortDirection(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        );
        
      case 'pivot':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Row Labels</label>
              <select 
                value={groupByColumn} 
                onChange={(e) => setGroupByColumn(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                {renderColumnOptions()}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Column Labels</label>
              <select 
                value={aggregateColumn} 
                onChange={(e) => setAggregateColumn(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                {renderColumnOptions()}
              </select>
            </div>
          </div>
        );
        
      case 'pseudonymize':
        return (
          <PseudonymizationControls
            columns={columns}
            columnsToAnonymize={columnsToAnonymize}
            toggleColumnAnonymization={toggleColumnAnonymization}
            columnAnonymizationTypes={columnAnonymizationTypes}
            updateAnonymizationType={updateAnonymizationType}
          />
        );
        
      case 'dropColumns':
        if (columnsToRemove.length === 1) {
          return null;
        }
        return (
          <DropColumnsControls
            columns={columns}
            columnsToRemove={columnsToRemove}
            toggleColumnRemoval={toggleColumnRemoval}
            applyTransformation={applyTransformation}
          />
        );
        
      case 'hashId':
        return (
          <HashIdControls
            columns={columns}
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
          />
        );
        
      case 'clustering':
        return (
          <ClusteringControls
            columns={columns}
            selectedColumn={filterColumn}
            setSelectedColumn={setFilterColumn}
            clusteringMethod={clusteringMethod}
            setClusteringMethod={setClusteringMethod}
            keyingFunction={keyingFunction}
            setKeyingFunction={setKeyingFunction}
            threshold={threshold}
            setThreshold={setThreshold}
            clusters={clusters}
            selectedClusters={selectedClusters}
            toggleClusterSelection={toggleClusterSelection}
            normalizedValues={normalizedValues}
            handleNormalizedValueChange={handleNormalizedValueChange}
            applyClusterChanges={applyClusterChanges}
            isProcessing={isProcessing}
            processedCount={processedCount}
            totalToProcess={totalToProcess}
          />
        );
        
      default:
        return null;
    }
  };

  return renderTransformationControls();
};

export default TransformationControls; 