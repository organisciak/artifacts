import React from 'react';

const TransformationDocs = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-bold mb-4">Transformation Types Documentation</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Filter Rows</h3>
          <p className="mb-2">Filter rows based on column values containing specific text.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Column:</strong> Select the column to filter on.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Value Contains:</strong> Enter text to filter for (case-insensitive).</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Filter a "Country" column for rows containing "united" to find both "United States" and "United Kingdom".</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Group & Aggregate</h3>
          <p className="mb-2">Group data by a column and perform calculations on another column.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Group By:</strong> Select a column to group records by (e.g., Category, Country).</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Aggregate Column:</strong> Select a column (usually numeric) to perform calculations on.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Function:</strong> Choose an aggregation function:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-2 mb-1">
              <li>Sum: Total of all values</li>
              <li>Average: Mean of values</li>
              <li>Minimum: Smallest value</li>
              <li>Maximum: Largest value</li>
              <li>Count: Number of records</li>
            </ul>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Group sales data by "Region" and sum the "Revenue" column to see total revenue by region.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Sort Data</h3>
          <p className="mb-2">Order the dataset by values in a specific column.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Sort By:</strong> Select the column to sort on.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Direction:</strong> Choose ascending (A→Z, 1→9) or descending (Z→A, 9→1) order.</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Sort a product list by "Price" in descending order to see most expensive items first.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Clean Data</h3>
          <p className="mb-2">Automatically clean and prepare data for analysis.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Actions performed:</strong></p>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-2 mb-1">
              <li>Remove rows with missing values</li>
              <li>Convert numeric strings to numbers</li>
              <li>Trim whitespace from text fields</li>
            </ul>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Clean survey data to remove incomplete responses and ensure numeric fields are properly formatted.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Pivot Table</h3>
          <p className="mb-2">Create a cross-tabulation of data similar to Excel pivot tables.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Row Labels:</strong> Select a column for the row dimension.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Column Labels:</strong> Select a column for the column dimension.</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Create a table showing product sales (counts) by region and category, with regions as rows and categories as columns.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Pseudonymize Data</h3>
          <p className="mb-2">Replace identifying information with fictional data while maintaining consistency.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Pseudonymize Columns:</strong> Select columns containing sensitive data to replace with fictional values.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Type Selection:</strong> Choose the appropriate type for each column:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-2 mb-1">
              <li>Full Name: Replaces with fictional full names</li>
              <li>First Name: Replaces with fictional first names</li>
              <li>Last Name: Replaces with fictional last names</li>
              <li>Username: Replaces with fictional usernames</li>
            </ul>
            <p className="text-sm text-gray-600 mb-1"><strong>Remove Columns:</strong> Completely remove columns that shouldn't be included in the output.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Mapping:</strong> Maintains consistency by always replacing a specific value with the same pseudonym.</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Pseudonymize customer data for sharing with analysts while protecting privacy.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Generate Hash IDs</h3>
          <p className="mb-2">Create a new column with hash identifiers based on values from selected columns.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>ID Column Name:</strong> Name for the new column containing hash IDs.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Auto-generate name:</strong> Creates a descriptive column name based on selected columns.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Hash Algorithm:</strong> Choose between a simple or more complex hash algorithm.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Salt:</strong> Optionally add a secret key to make hashes unique but non-reproducible.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Columns for Hash:</strong> Select which columns to include when generating the hash ID.</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Create persistent anonymous identifiers from demographic data, or generate unique IDs from multiple fields.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Cluster & Edit Values</h3>
          <p className="mb-2">Find and merge similar values in a column using various clustering algorithms.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Select Column:</strong> Choose a column that may contain variations of the same value.</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Clustering Methods:</strong></p>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-2 mb-1">
              <li><strong>Key collision:</strong> Transforms values into keys that ignore differences in case, word order, etc.</li>
              <li><strong>N-Gram Fingerprint:</strong> Creates keys based on character sequences, helpful for spotting typos.</li>
              <li><strong>Phonetic fingerprint:</strong> Groups values that sound similar using phonetic algorithms.</li>
              <li><strong>Nearest neighbor:</strong> Groups values based on similarity measures like Levenshtein distance.</li>
            </ul>
            <p className="text-sm text-gray-600 mb-1"><strong>Similarity Threshold:</strong> For Levenshtein method, controls how similar values need to be to cluster.</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Find and standardize variations like "United States", "USA", "U.S.A", and "US" in a Country column.</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-blue-700">Drop Columns</h3>
          <p className="mb-2">Remove unnecessary columns from your dataset.</p>
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-sm text-gray-600 mb-1"><strong>Select columns:</strong> Choose which columns to completely remove from the dataset.</p>
            <p className="text-sm text-gray-600"><strong>Example:</strong> Remove sensitive columns like "SSN" or "Phone Number" before sharing data with others, or remove irrelevant columns to simplify your analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransformationDocs; 