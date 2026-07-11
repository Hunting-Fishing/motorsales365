
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export function CustomerPortalLink() {
  return (
    <div className="my-4 px-4">
      <Link to="/customer-portal" className="block">
        <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-blue-700 font-medium">Customer Portal</span>
        </Button>
      </Link>
    </div>
  );
}
