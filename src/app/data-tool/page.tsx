"use client";
import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import FileUploadSection from './components/FileUploadSection';
import TransformationSection from './components/TransformationSection';
import ResultsSection from './components/ResultsSection';
import TransformationDocs from './components/TransformationDocs';
import { useCSVData } from './hooks/useCSVData';
import { useTransformation } from './hooks/useTransformation';
import TransformationHistory from './components/TransformationHistory';

const CSVTransformer = () => {
  const [csvData, setCsvData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState([]);
  
  const {
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
    isProcessing,
    processedCount,
    totalToProcess,
    workingData,
    transformationStack,
    currentStackIndex,
    undoTransformation,
    redoTransformation
  } = useTransformation(csvData, fileName, columns);

  // Add a new function to handle column transformation selections
  const handleColumnTransform = (column, transformType, direction) => {
    // Set the transformation type
    setTransformationType(transformType);
    
    // Set the appropriate column based on the transformation type
    switch (transformType) {
      case 'filter':
        setFilterColumn(column);
        break;
      case 'sort':
        setSortColumn(column);
        setSortDirection(direction || 'asc');
        // Apply the sort immediately if direction is provided
        if (direction) {
          setTimeout(() => applyTransformation(), 0);
        }
        break;
      case 'groupBy':
        setGroupByColumn(column);
        break;
      case 'clustering':
        setFilterColumn(column);
        break;
      case 'pseudonymize':
        // Select the column for pseudonymization
        toggleColumnAnonymization(column, true);
        break;
      case 'hashId':
        // Add the column to hash ID calculation if not already selected
        if (!selectedHashColumns.includes(column)) {
          toggleHashColumnSelection(column);
        }
        break;
      case 'dropColumns':
        // Select the column for removal
        toggleColumnRemoval(column, true);
        // Apply the transformation immediately
        setTimeout(() => applyTransformation(), 0);
        break;
      default:
        break;
    }
    
    // Scroll to the transformation section
    const transformSection = document.querySelector('.transform-section');
    if (transformSection) {
      transformSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFileUpload = useCallback((data, name, cols) => {
    setCsvData(data);
    setFileName(name);
    setColumns(cols);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">CSV Data Transformer</h1>
      <p className="text-gray-600 mb-4">
        This tool allows you to transform your CSV data using various techniques.
        You can clean data, pivot tables, pseudonymize data, or generate hash IDs.
        Useful for quick data wrangling and curation.
      </p>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-2/3">
          <FileUploadSection 
            handleFileUpload={handleFileUpload}
            fileName={fileName}
            onColumnTransform={handleColumnTransform}
          />
        </div>
        
        {csvData && (
          <div className="md:w-1/3">
            <TransformationHistory
              transformationStack={transformationStack}
              currentStackIndex={currentStackIndex}
              undoTransformation={undoTransformation}
              redoTransformation={redoTransformation}
            />
          </div>
        )}
      </div>
      
      {csvData && (
        <>
          <div className="transform-section">
            <TransformationSection 
              transformationType={transformationType}
              setTransformationType={setTransformationType}
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
              applyTransformation={applyTransformation}
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
        </>
      )}
      
      {transformedData && (
        <ResultsSection 
          transformedData={transformedData}
          transformedView={transformedView}
          setTransformedView={setTransformedView}
          exportCSV={exportCSV}
          transformationType={transformationType}
          mappingData={mappingData}
          exportMapping={exportMapping}
          columnAnonymizationTypes={columnAnonymizationTypes}
          onColumnTransform={handleColumnTransform}
        />
      )}
      
      {/* Documentation Section */}
      <TransformationDocs />
    </div>
  );
};

export default CSVTransformer;