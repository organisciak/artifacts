import React from 'react';
import { ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DataTable = ({ 
  data, 
  onColumnTransform, 
  transformationType 
}) => {
  if (!data || data.length === 0) return <p>No data to display</p>;
  
  const columns = Object.keys(data[0]);
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, i) => (
              <th 
                key={i}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex items-center space-x-1">
                  {column}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100">
                      <ChevronDown className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Transform {column}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onColumnTransform(column, 'filter')}>
                        Filter by this column
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onColumnTransform(column, 'groupBy')}>
                        Group by this column
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onColumnTransform(column, 'clustering')}>
                        Clean & cluster values
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <div className="flex items-center justify-between w-full">
                          <span>Sort</span>
                          <div className="flex space-x-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onColumnTransform(column, 'sort', 'asc');
                              }}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Sort ascending"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onColumnTransform(column, 'sort', 'desc');
                              }}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Sort descending"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onColumnTransform(column, 'dropColumns', column);
                        }}
                      >
                        Drop Column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable; 