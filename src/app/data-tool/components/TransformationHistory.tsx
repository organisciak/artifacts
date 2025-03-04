import React from 'react';
import { Undo, Redo } from 'lucide-react';

const TransformationHistory = ({
  transformationStack,
  currentStackIndex,
  undoTransformation,
  redoTransformation
}) => {
  const formatTransformation = (transform) => {
    switch (transform.type) {
      case 'filter':
        return `Filter "${transform.params.column}" containing "${transform.params.value}"`;
      case 'sort':
        return `Sort by "${transform.params.column}" (${transform.params.direction})`;
      case 'groupBy':
        return `Group by "${transform.params.groupBy}", ${transform.params.function} of "${transform.params.aggregate}"`;
      case 'clustering':
        return `Cluster values in "${transform.params.column}"`;
      case 'pseudonymize':
        return `Pseudonymize ${transform.params.columnsToAnonymize?.length || 0} column(s)`;
      case 'hashId':
        return `Generate hash IDs from ${transform.params.columns?.length || 0} column(s)`;
      default:
        return `${transform.type.charAt(0).toUpperCase() + transform.type.slice(1)} transformation`;
    }
  };

  const getTimeString = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-medium">Transformation History</h3>
        <div className="flex space-x-2">
          <button 
            onClick={undoTransformation}
            disabled={currentStackIndex < 0}
            className={`p-1 rounded ${currentStackIndex < 0 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-100'}`}
            title="Undo"
          >
            <Undo className="h-5 w-5" />
          </button>
          <button 
            onClick={redoTransformation}
            disabled={currentStackIndex >= transformationStack.length - 1}
            className={`p-1 rounded ${currentStackIndex >= transformationStack.length - 1 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-100'}`}
            title="Redo"
          >
            <Redo className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {transformationStack.length === 0 ? (
        <p className="text-sm text-gray-500">No transformations applied yet.</p>
      ) : (
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {transformationStack.map((transform, index) => (
            <li 
              key={index}
              className={`text-sm p-2 rounded ${
                index === currentStackIndex 
                  ? 'bg-blue-100' 
                  : index > currentStackIndex 
                    ? 'bg-gray-50 text-gray-400' 
                    : 'bg-gray-50'
              }`}
            >
              <div className="flex justify-between">
                <span>{formatTransformation(transform)}</span>
                <span className="text-xs text-gray-500">{getTimeString(transform.timestamp)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransformationHistory; 