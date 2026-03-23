"use client";
import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import FileUploadSection from './components/FileUploadSection';
import TransformationSection from './components/TransformationSection';
import ResultsSection from './components/ResultsSection';
import TransformationDocs from './components/TransformationDocs';
import SummaryStatistics from './components/SummaryStatistics';
import { useCSVData } from './hooks/useCSVData';
import { useTransformation } from './hooks/useTransformation';
import TransformationHistory from './components/TransformationHistory';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';

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
    keyingFunction,
    clusters,
    threshold,
    normalizedValues,
    selectedClusters,
    toggleColumnAnonymization,
    updateAnonymizationType,
    toggleColumnRemoval,
    toggleHashColumnSelection,
    setIdColumnName,
    setUseAutoColumnName,
    getAutoColumnName,
    setHashAlgorithm,
    setUseSalt,
    setSaltValue,
    setClusteringMethod,
    setKeyingFunction,
    setThreshold,
    toggleClusterSelection,
    handleNormalizedValueChange,
    exportCSV,
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
    isProcessing,
    processedCount,
    totalToProcess,
    workingData,
    transformationStack,
    currentStackIndex,
    undoTransformation,
    redoTransformation,
    applyClusterChanges
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
        // Find a numeric column for aggregation
        const numericColumn = columns.find(col => {
          if (col === column) return false; // Don't aggregate the groupBy column
          // Check if column has numeric values
          const hasNumericValues = csvData.some(row => {
            const val = row[col];
            return val !== null && val !== undefined && !isNaN(Number(val));
          });
          return hasNumericValues;
        });
        if (numericColumn) {
          setAggregateColumn(numericColumn);
        }
        break;
      case 'clustering':
        setFilterColumn(column);
        break;
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback((data, name, cols) => {
    setCsvData(data);
    setFileName(name);
    setColumns(cols);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ToysNav />
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
          <div className="mt-8">
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
      
      {/* Summary Statistics Section */}
      {transformedData && (
        <SummaryStatistics data={transformedData} />
      )}
      
      {/* Documentation Section */}
      <TransformationDocs />
      
      <hr className='mb-8' />
      <Footer />
    </div>
  );
};

export default CSVTransformer;