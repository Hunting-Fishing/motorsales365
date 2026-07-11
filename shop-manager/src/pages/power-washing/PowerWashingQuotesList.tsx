import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter,
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Phone
} from 'lucide-react';
import { usePowerWashingQuotes } from '@/hooks/usePowerWashing';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn, SlideIn } from '@/components/layout/AnimatedPage';
import { AnimatedList } from '@/components/ui/animated-list';
import { motion } from 'framer-motion';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  contacted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  quoted: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  accepted: 'bg-green-500/10 text-green-500 border-green-500/20',
  declined: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function PowerWashingQuotesList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: quotes, isLoading } = usePowerWashingQuotes(
    statusFilter === 'all' ? undefined : statusFilter
  );

  const filteredQuotes = quotes?.filter(quote => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      quote.customer_name.toLowerCase().includes(query) ||
      quote.property_address.toLowerCase().includes(query) ||
      quote.quote_number.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <FadeIn className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quote Requests</h1>
            <p className="text-muted-foreground">Manage customer quote requests</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate('/power-washing/quotes/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </motion.div>
        </div>
      </FadeIn>

      {/* Filters */}
      <SlideIn direction="down" delay={0.1} className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </SlideIn>

      {/* Quotes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredQuotes && filteredQuotes.length > 0 ? (
        <AnimatedList variant="slide" staggerDelay={0.05} className="space-y-4">
          {filteredQuotes.map((quote) => (
            <motion.div
              key={quote.id}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/power-washing/quotes/${quote.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{quote.quote_number}</h3>
                        <Badge className={statusColors[quote.status] || ''}>
                          {quote.status}
                        </Badge>
                        <Badge variant="outline">{quote.source}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{quote.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{quote.property_address}</span>
                        </div>
                        {quote.customer_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{quote.customer_phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {quote.services_requested?.map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(quote.created_at), 'MMM d, yyyy')}
                      </p>
                      {quote.quoted_price && (
                        <p className="text-lg font-semibold text-green-600">
                          ${quote.quoted_price.toLocaleString()}
                        </p>
                      )}
                      {quote.preferred_date && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Preferred: {format(new Date(quote.preferred_date), 'MMM d')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatedList>
      ) : (
        <FadeIn delay={0.2}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No quotes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search' : 'No quote requests yet'}
              </p>
              <Button onClick={() => navigate('/power-washing/quotes/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quote
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
