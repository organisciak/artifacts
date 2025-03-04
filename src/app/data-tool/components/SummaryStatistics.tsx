import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const SummaryStatistics = ({ data }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const numericColumns = [];
    const categoricalColumns = [];
    const columnStats = {};

    // Identify column types and calculate basic stats
    Object.keys(data[0]).forEach(column => {
      // Check if column has numeric values
      const numericValues = data
        .map(row => row[column])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));

      if (numericValues.length > 0 && numericValues.length >= data.length * 0.5) {
        // If at least 50% of values are numeric, treat as numeric column
        numericColumns.push(column);
        
        // Calculate numeric stats
        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, val) => acc + val, 0);
        const mean = sum / sorted.length;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        
        // Calculate standard deviation
        const squaredDiffs = sorted.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / sorted.length;
        const stdDev = Math.sqrt(variance);
        
        // Generate histogram data for distribution chart
        const range = max - min;
        const binCount = Math.min(10, Math.ceil(Math.sqrt(numericValues.length)));
        const binWidth = range / binCount;
        
        const histogramData = Array(binCount).fill(0).map((_, i) => {
          const binStart = min + i * binWidth;
          const binEnd = binStart + binWidth;
          const count = numericValues.filter(val => 
            val >= binStart && (i === binCount - 1 ? val <= binEnd : val < binEnd)
          ).length;
          
          return {
            bin: i,
            binRange: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
            count,
            frequency: count / numericValues.length
          };
        });
        
        columnStats[column] = {
          type: 'numeric',
          count: data.length,
          validCount: numericValues.length,
          missing: data.length - numericValues.length,
          mean: mean.toFixed(2),
          median: median.toFixed(2),
          min: min.toFixed(2),
          max: max.toFixed(2),
          stdDev: stdDev.toFixed(2),
          histogramData
        };
      } else {
        // Treat as categorical column
        categoricalColumns.push(column);
        
        // Count frequencies of each value
        const valueFrequency = {};
        data.forEach(row => {
          const value = row[column] !== null && row[column] !== undefined ? String(row[column]) : 'null';
          valueFrequency[value] = (valueFrequency[value] || 0) + 1;
        });
        
        // Find most common values
        const sortedValues = Object.entries(valueFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        // Count unique values
        const uniqueCount = Object.keys(valueFrequency).length;
        
        columnStats[column] = {
          type: 'categorical',
          count: data.length,
          uniqueCount,
          topValues: sortedValues.map(([value, count]) => ({ 
            value, 
            count, 
            percentage: ((count / data.length) * 100).toFixed(1) 
          }))
        };
      }
    });

    return {
      rowCount: data.length,
      columnCount: Object.keys(data[0]).length,
      numericColumns,
      categoricalColumns,
      columnStats
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Summary Statistics</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Rows:</span> {stats.rowCount} | 
          <span className="font-medium ml-2">Columns:</span> {stats.columnCount} | 
          <span className="font-medium ml-2">Numeric columns:</span> {stats.numericColumns.length} | 
          <span className="font-medium ml-2">Categorical columns:</span> {stats.categoricalColumns.length}
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Render cards for all columns */}
        {Object.keys(stats.columnStats).map(column => {
          const columnStat = stats.columnStats[column];
          
          return (
            <React.Fragment key={column}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{column}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {columnStat.type === 'numeric' ? 'Numeric' : 'Categorical'}
                  </p>
                </CardHeader>
                
                <CardContent>
                  {columnStat.type === 'numeric' ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mean:</span>
                        <span>{columnStat.mean}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Median:</span>
                        <span>{columnStat.median}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min:</span>
                        <span>{columnStat.min}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max:</span>
                        <span>{columnStat.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Std Dev:</span>
                        <span>{columnStat.stdDev}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid:</span>
                        <span>{columnStat.validCount}/{columnStat.count}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Unique values:</span>
                        <span>{columnStat.uniqueCount}</span>
                      </div>
                      
                      {columnStat.topValues.length > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-1">Top values:</div>
                          <div className="space-y-1">
                            {columnStat.topValues.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="truncate max-w-[60%]">
                                  {item.value === 'null' ? 
                                    <span className="text-gray-400 italic">null</span> : 
                                    item.value}
                                </span>
                                <span className="text-muted-foreground">
                                  {item.count} ({item.percentage}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Distribution chart for numeric columns */}
              {columnStat.type === 'numeric' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{column} Distribution</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Value frequency
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={columnStat.histogramData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="binRange" 
                            tickFormatter={(value) => value.split('-')[0]}
                            tickMargin={8}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <Tooltip 
                            formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'Frequency']}
                            labelFormatter={(label) => `Range: ${label}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="frequency" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary))" 
                            fillOpacity={0.4} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SummaryStatistics;