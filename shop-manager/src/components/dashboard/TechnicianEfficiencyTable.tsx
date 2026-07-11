
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TechnicianEfficiencyData } from "@/types/dashboard";
import { Loader2 } from "lucide-react";

interface TechnicianEfficiencyTableProps {
  data: TechnicianEfficiencyData[];
  isLoading: boolean;
}

export function TechnicianEfficiencyTable({ data, isLoading }: TechnicianEfficiencyTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Technician Efficiency</CardTitle>
          <CardDescription>Billable hours and efficiency metrics</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Technician Efficiency</CardTitle>
          <CardDescription>Billable hours and efficiency metrics</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">No technician efficiency data available</p>
        </CardContent>
      </Card>
    );
  }

  // Sort technicians by efficiency
  const sortedData = [...data].sort((a, b) => b.efficiency - a.efficiency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technician Efficiency</CardTitle>
        <CardDescription>Billable hours and efficiency metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technician</TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
              <TableHead className="text-right">Billable Hours</TableHead>
              <TableHead className="text-right">Efficiency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((tech, index) => (
              <TableRow key={tech.id} colorIndex={index}>
                <TableCell className="font-medium">{tech.name}</TableCell>
                <TableCell className="text-right">{tech.totalHours.toFixed(1)}</TableCell>
                <TableCell className="text-right">{tech.billableHours.toFixed(1)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <span 
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        tech.efficiency >= 80 ? "bg-green-100 text-green-800" :
                        tech.efficiency >= 60 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}
                    >
                      {tech.efficiency}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
