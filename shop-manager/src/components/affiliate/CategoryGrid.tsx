
import React from "react";
import { Card } from "@/components/ui/card";
import { Segment, Header, Grid } from "semantic-ui-react";
import { ToolCategory } from "@/types/affiliate";
import { Wrench, Hammer, Cog, Gauge, Zap, Flame, Snowflake, Settings, Cloud, Droplet, Car } from "lucide-react";
import { Link } from "react-router-dom";

interface CategoryGridProps {
  categories: ToolCategory[];
}

// Icon mapping for categories
const getCategoryIcon = (name: string) => {
  switch(name) {
    case 'Engine': return <Cog className="h-5 w-5 text-blue-600" />;
    case 'Brakes': return <Gauge className="h-5 w-5 text-red-600" />;
    case 'Steering & Suspension': return <Wrench className="h-5 w-5 text-purple-600" />;
    case 'Diagnostics': return <Settings className="h-5 w-5 text-green-600" />; // Changed from Tool to Settings
    case 'Electrical': return <Zap className="h-5 w-5 text-yellow-600" />;
    case 'Heating': return <Flame className="h-5 w-5 text-orange-600" />;
    case 'Cooling': return <Snowflake className="h-5 w-5 text-cyan-600" />;
    case 'Drivetrain': return <Settings className="h-5 w-5 text-indigo-600" />; // Changed from Cogs to Settings
    case 'Exhaust': return <Cloud className="h-5 w-5 text-gray-600" />;
    case 'Fuel': return <Droplet className="h-5 w-5 text-emerald-600" />;
    case 'Body': return <Car className="h-5 w-5 text-amber-600" />;
    default: return <Hammer className="h-5 w-5 text-blue-600" />;
  }
};

// Get gradient class based on category
const getCategoryGradient = (name: string) => {
  switch(name) {
    case 'Engine': return 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 border-blue-200 dark:border-blue-700';
    case 'Brakes': return 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 border-red-200 dark:border-red-700';
    case 'Steering & Suspension': return 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 border-purple-200 dark:border-purple-700';
    case 'Diagnostics': return 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 border-green-200 dark:border-green-700';
    case 'Electrical': return 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 border-yellow-200 dark:border-yellow-700';
    case 'Heating': return 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 border-orange-200 dark:border-orange-700';
    case 'Cooling': return 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/30 border-cyan-200 dark:border-cyan-700';
    case 'Drivetrain': return 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30 border-indigo-200 dark:border-indigo-700';
    case 'Exhaust': return 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/30 border-gray-200 dark:border-gray-700';
    case 'Fuel': return 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/30 border-emerald-200 dark:border-emerald-700';
    case 'Body': return 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30 border-amber-200 dark:border-amber-700';
    default: return 'from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/30 border-slate-200 dark:border-slate-700';
  }
};

const CategoryGrid = ({ categories }: CategoryGridProps) => {
  return (
    <Segment raised className="bg-white">
      <Header as="h2" className="text-2xl font-semibold mb-6 flex items-center">
        <Settings className="mr-2 text-blue-600" /> {/* Changed from Tool to Settings */}
        Shop by Category
      </Header>
      <Grid columns={3} stackable doubling>
        {categories.map((category) => (
          <Grid.Column key={category.id}>
            <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 duration-300 overflow-hidden border border-gray-200">
              <div className={`bg-gradient-to-br ${getCategoryGradient(category.name)} p-6 h-full`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    {getCategoryIcon(category.name)}
                  </div>
                  <h3 className="text-lg font-medium">{category.name}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{category.description}</p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-1">
                  {category.subcategories && category.subcategories.slice(0, 3).map((sub, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="mr-1">•</span> {sub}
                    </li>
                  ))}
                  {category.subcategories && category.subcategories.length > 3 && (
                    <li className="text-blue-600 dark:text-blue-400">+ {category.subcategories.length - 3} more...</li>
                  )}
                </ul>
                <div className="mt-auto pt-4">
                  <Link 
                    to={`/tools/${category.slug}`} 
                    className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Browse {category.name}
                  </Link>
                </div>
              </div>
            </Card>
          </Grid.Column>
        ))}
      </Grid>
    </Segment>
  );
};

export default CategoryGrid;
