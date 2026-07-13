
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { validateDatabaseStructure, testDatabaseOperations } from '@/lib/services/databaseUtils';
import { enableServiceTableRLS } from '@/lib/services/serviceRLS';

interface DiagnosticResult {
  table: string;
  accessible: boolean;
  error: string | null;
}

export function DatabaseDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [operationTest, setOperationTest] = useState<{ success: boolean; error: string | null } | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      console.log('Running database diagnostics...');
      
      // Check RLS policies
      await enableServiceTableRLS();
      
      // Validate database structure
      const structureResults = await validateDatabaseStructure();
      setResults(structureResults);
      
      // Test basic operations
      const operationResults = await testDatabaseOperations();
      setOperationTest(operationResults);
      
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setOperationTest({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (accessible: boolean) => {
    return accessible ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (accessible: boolean) => {
    return accessible ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Accessible
      </Badge>
    ) : (
      <Badge variant="destructive">
        Error
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Running Diagnostics...' : 'Run Database Diagnostics'}
          </Button>

          {results.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Table Accessibility:</h4>
              <div className="grid grid-cols-1 gap-2">
                {results.map((result) => (
                  <div
                    key={result.table}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.accessible)}
                      <span className="font-medium">{result.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.accessible)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {operationTest && (
            <div className="space-y-3">
              <h4 className="font-medium">Database Operations Test:</h4>
              <Alert variant={operationTest.success ? "default" : "destructive"}>
                {operationTest.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <div>
                      <strong>Status:</strong> {operationTest.success ? 'Success' : 'Failed'}
                    </div>
                    {operationTest.error && (
                      <div>
                        <strong>Error:</strong> {operationTest.error}
                      </div>
                    )}
                    {operationTest.success && (
                      <div>All basic database operations (insert, select, delete) are working correctly.</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>Note:</strong> If tables show as inaccessible, you may need to:</div>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Check Row-Level Security (RLS) policies in Supabase</li>
                  <li>Ensure you're authenticated with proper permissions</li>
                  <li>Verify the service tables exist in your database</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
