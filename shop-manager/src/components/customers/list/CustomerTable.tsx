
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types/customer";
import { Eye, Edit, Phone, Mail, MapPin, Building, User } from "lucide-react";
import { Link } from "react-router-dom";

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  error: string | null;
}

export const CustomerTable = ({ customers, loading, error }: CustomerTableProps) => {
  if (!customers || customers.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="h-32">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-slate-100 rounded-full">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">No customers found</p>
              <p className="text-xs text-slate-500">Try adjusting your search filters or add new customers</p>
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {customers.map((customer) => (
        <TableRow 
          key={customer.id} 
          className="hover:bg-slate-50/80 transition-all duration-200 border-slate-100 group"
        >
          {/* Customer Information */}
          <TableCell className="py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">
                    {customer.first_name?.[0]?.toUpperCase() || 'C'}
                    {customer.last_name?.[0]?.toUpperCase() || ''}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">
                  {customer.first_name} {customer.last_name}
                </div>
                {customer.company && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Building className="h-3 w-3" />
                    {customer.company}
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  ID: {customer.id.slice(0, 8)}...
                </div>
              </div>
            </div>
          </TableCell>

          {/* Contact Details */}
          <TableCell className="py-4">
            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-700 truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-700">{customer.phone}</span>
                </div>
              )}
              {!customer.email && !customer.phone && (
                <span className="text-sm text-slate-400 italic">No contact info</span>
              )}
            </div>
          </TableCell>

          {/* Address */}
          <TableCell className="py-4">
            {customer.address ? (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700 line-clamp-2">{customer.address}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-400 italic">No address</span>
            )}
          </TableCell>

          {/* Tags & Status */}
          <TableCell className="py-4">
            <div className="space-y-2">
              {customer.tags && customer.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {customer.tags.slice(0, 2).map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {customer.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      +{customer.tags.length - 2}
                    </Badge>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="text-xs px-2 py-0.5 text-slate-500">
                  No tags
                </Badge>
              )}
              
              <div className="mt-1">
                <Badge 
                  variant={customer.status === 'active' ? 'default' : 'secondary'}
                  className={`text-xs px-2 py-0.5 ${
                    customer.status === 'active' 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {customer.status || 'Active'}
                </Badge>
              </div>
            </div>
          </TableCell>

          {/* Actions */}
          <TableCell className="text-right py-4">
            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
              >
                <Link to={`/customers/${customer.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 w-8 p-0 hover:bg-slate-100 hover:text-slate-600"
              >
                <Link to={`/customers/${customer.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
