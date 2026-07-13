
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomReportBuilder } from '@/components/reports/CustomReportBuilder';
import { ReportConfig } from '@/types/reports';
import { Skeleton } from "@/components/ui/skeleton";

interface CustomTabContentProps {
  customReportConfig: ReportConfig | null;
  onGenerateReport: (config: ReportConfig) => void;
  isLoading?: boolean;
}

export function CustomTabContent({ customReportConfig, onGenerateReport, isLoading = false }: CustomTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6 p-4">
              <Skeleton className="h-6 w-[250px] mx-auto" />
              <Skeleton className="h-4 w-[350px] mx-auto" />
              <div className="border rounded-md p-4 space-y-4">
                <Skeleton className="h-5 w-[150px]" />
                <div className="space-y-2">
                  {Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
                
                <Skeleton className="h-5 w-[120px] mt-6" />
                <Skeleton className="h-4 w-[200px]" />
                
                <Skeleton className="h-5 w-[100px] mt-6" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {customReportConfig ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{customReportConfig.title}</CardTitle>
              <CardDescription>{customReportConfig.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-10">
                <p className="text-lg font-medium mb-4">Custom Report Generated</p>
                <p className="text-muted-foreground mb-6">
                  Your custom report with {customReportConfig.fields.length} selected fields has been created.
                </p>
                <div className="border rounded-md p-4 bg-muted/20 text-left">
                  <h3 className="font-medium mb-2">Selected Fields:</h3>
                  <ul className="list-disc pl-5">
                    {customReportConfig.fields.map((field) => (
                      <li key={field} className="mb-1">{field}</li>
                    ))}
                  </ul>
                  
                  {customReportConfig.groupBy && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Grouped By:</h3>
                      <p>{customReportConfig.groupBy}</p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Sorting:</h3>
                    <p>
                      {customReportConfig.sorting.field} ({customReportConfig.sorting.direction === 'asc' ? 'Ascending' : 'Descending'})
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mt-6">
                  This report is now connected to live data and will automatically refresh based on your settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 border rounded-md bg-muted/10">
          <h3 className="text-xl font-medium mb-2">No Custom Report Generated</h3>
          <p className="text-muted-foreground mb-6">Use the Custom Report builder to create your own reports.</p>
          <CustomReportBuilder />
        </div>
      )}
    </div>
  );
}
