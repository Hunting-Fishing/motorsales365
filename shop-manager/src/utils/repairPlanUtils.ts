
/**
 * Returns the CSS class for a repair plan status badge
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'bg-slate-200 text-slate-800';
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'in-progress': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};

/**
 * Returns the CSS class for a repair plan priority badge
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};
