
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CustomerSegmentType, 
  analyzeCustomerSegments 
} from '@/utils/analytics/customerSegmentation';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerSegmentBadgesProps {
  customerId: string;
  className?: string;
  showDetailedView?: boolean;
}

interface SegmentDetail {
  name: string;
  description: string;
  criteria: string[];
  recommendations: string[];
}

const segmentDetails: Record<CustomerSegmentType, SegmentDetail> = {
  high_value: {
    name: 'High Value',
    description: 'Customers who generate significant revenue and have high lifetime value.',
    criteria: ['Lifetime value > $1,000', 'Multiple vehicles serviced', 'Regular service intervals'],
    recommendations: [
      'Offer premium service options',
      'Provide dedicated service advisor',
      'Send personalized communications'
    ]
  },
  medium_value: {
    name: 'Medium Value',
    description: 'Reliable customers with moderate spending patterns.',
    criteria: ['Lifetime value $300-$1,000', 'Regular service history', 'Responsive to promotions'],
    recommendations: [
      'Upsell additional services',
      'Encourage service plan enrollment',
      'Send targeted promotions'
    ]
  },
  low_value: {
    name: 'Low Value',
    description: 'Customers with minimal spending or infrequent service.',
    criteria: ['Lifetime value < $300', 'Few service visits', 'No additional purchases'],
    recommendations: [
      'Offer introductory service packages',
      'Build awareness of full service range',
      'Provide educational content'
    ]
  },
  new: {
    name: 'New Customer',
    description: 'Recently acquired customers with limited history.',
    criteria: ['First service visit', 'No established pattern', 'Recent acquisition'],
    recommendations: [
      'Focus on exceptional first experience',
      'Provide welcome materials',
      'Schedule early follow-up contact'
    ]
  },
  at_risk: {
    name: 'At Risk',
    description: 'Customers showing signs of potential churn.',
    criteria: ['180+ days since last service', 'Declining service frequency', 'Unresolved complaints'],
    recommendations: [
      'Reach out with personalized communication',
      'Offer service incentives',
      'Address any previous issues'
    ]
  },
  loyal: {
    name: 'Loyal',
    description: 'Long-term customers with consistent service history.',
    criteria: ['3+ service visits', 'Regular service intervals', 'Positive reviews/feedback'],
    recommendations: [
      'Recognize loyalty with perks',
      'Invite to exclusive events',
      'Seek referrals'
    ]
  },
  inactive: {
    name: 'Inactive',
    description: 'Customers who haven\'t returned for service in a year or more.',
    criteria: ['No service in 365+ days', 'Previous history of services', 'Not responding to communications'],
    recommendations: [
      'Re-engagement campaign',
      'Special "win-back" offer',
      'Request feedback about absence'
    ]
  }
};

export const CustomerSegmentBadges: React.FC<CustomerSegmentBadgesProps> = ({ 
  customerId,
  className,
  showDetailedView = false
}) => {
  const [segments, setSegments] = useState<CustomerSegmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegmentType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSegments = async () => {
      setLoading(true);
      try {
        const customerSegments = await analyzeCustomerSegments(customerId);
        setSegments(customerSegments);
      } catch (error) {
        console.error("Error fetching customer segments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, [customerId]);

  // Get segment styling based on type
  const getSegmentStyle = (segment: CustomerSegmentType) => {
    switch (segment) {
      case 'high_value':
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case 'medium_value':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case 'low_value':
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case 'new':
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case 'at_risk':
        return "bg-amber-100 text-amber-800 hover:bg-amber-200";
      case 'loyal':
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      case 'inactive':
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  // Format segment name for display
  const formatSegmentName = (segment: CustomerSegmentType) => {
    return segment.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleBadgeClick = (segment: CustomerSegmentType) => {
    if (showDetailedView) {
      setSelectedSegment(segment);
      setIsDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {segments.length > 0 ? (
          segments.map((segment) => (
            <Badge 
              key={segment} 
              variant="outline"
              className={`${getSegmentStyle(segment)} ${showDetailedView ? 'cursor-pointer' : ''}`}
              onClick={() => handleBadgeClick(segment)}
            >
              {formatSegmentName(segment)}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No segments assigned</span>
        )}
      </div>

      {showDetailedView && selectedSegment && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className={`text-lg ${getSegmentStyle(selectedSegment)}`}>
                {segmentDetails[selectedSegment].name} Segment
              </DialogTitle>
              <DialogDescription>
                {segmentDetails[selectedSegment].description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <h4 className="text-sm font-medium mb-2">Segment Criteria</h4>
              <ul className="list-disc list-inside space-y-1">
                {segmentDetails[selectedSegment].criteria.map((criterion, index) => (
                  <li key={index} className="text-sm">{criterion}</li>
                ))}
              </ul>
              
              <h4 className="text-sm font-medium mt-4 mb-2">Recommended Actions</h4>
              <ul className="list-disc list-inside space-y-1">
                {segmentDetails[selectedSegment].recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm">{recommendation}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
