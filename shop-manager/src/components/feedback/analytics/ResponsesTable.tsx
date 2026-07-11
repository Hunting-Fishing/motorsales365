
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FeedbackResponse } from '@/types/feedback';
import { Star } from './Star';

interface ResponsesTableProps {
  responses: FeedbackResponse[];
}

export const ResponsesTable: React.FC<ResponsesTableProps> = ({ responses }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Responses</CardTitle>
        <CardDescription>
          Showing the {Math.min(responses.length, 10)} most recent feedback submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</TableHead>
                <TableHead className="px-4 py-2 text-left text-sm font-medium text-gray-500">Customer ID</TableHead>
                <TableHead className="px-4 py-2 text-left text-sm font-medium text-gray-500">Work Order</TableHead>
                <TableHead className="px-4 py-2 text-left text-sm font-medium text-gray-500">Overall Rating</TableHead>
                <TableHead className="px-4 py-2 text-left text-sm font-medium text-gray-500">NPS Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.length > 0 ? (
                responses.slice(0, 10).map((response, index) => (
                  <TableRow key={response.id} colorIndex={index}>
                    <TableCell>
                      {format(new Date(response.submitted_at), 'PP p')}
                    </TableCell>
                    <TableCell>
                      {response.customer_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {response.work_order_id 
                        ? response.work_order_id.substring(0, 8) + '...' 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {response.overall_rating 
                        ? <div className="flex items-center">
                            {Array(response.overall_rating).fill(0).map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                            ))}
                          </div>
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {response.nps_score !== null && response.nps_score !== undefined
                        ? <span className={`px-2 py-1 rounded text-white ${
                            response.nps_score >= 9 
                              ? 'bg-green-500' 
                              : response.nps_score >= 7 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                          }`}>
                            {response.nps_score}
                          </span>
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No responses yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
