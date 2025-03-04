"use client";
import React, { useState } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import FileUploadSection from './components/FileUploadSection';
import TransformationSection from './components/TransformationSection';
import ResultsSection from './components/ResultsSection';
import TransformationDocs from './components/TransformationDocs';
import { useCSVData } from './hooks/useCSVData';
import { useTransformation } from './hooks/useTransformation';

const CSVTransformer = () => {
  const { 
    csvData, 
    columns, 
    fileName, 
    dataPreview, 
    handleFileUpload 
  } = useCSVData();
  
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
    totalToProcess
  } = useTransformation(csvData, fileName, columns);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">CSV Data Transformer</h1>
      <p className="text-gray-600 mb-4">
        This tool allows you to transform your CSV data using various techniques.
        You can clean data, pivot tables, pseudonymize data, or generate hash IDs.
        Useful for quick data wrangling and curation.
      </p>
      
      <FileUploadSection 
        handleFileUpload={handleFileUpload}
        fileName={fileName}
        dataPreview={dataPreview}
      />
      
      {csvData && (
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
        />
      )}
      
      {/* Documentation Section */}
      <TransformationDocs />
    </div>
  );
};

export default CSVTransformer;