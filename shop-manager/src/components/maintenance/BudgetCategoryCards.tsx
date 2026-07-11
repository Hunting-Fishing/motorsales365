import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Wrench,
  ShieldCheck,
  Fuel,
  HardHat,
  Package,
  Users,
} from "lucide-react";

interface BudgetCategoryCardsProps {
  stats: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    utilizationPercent: number;
    partsBudget: number;
    partsSpent: number;
    laborBudget: number;
    laborSpent: number;
    safetyBudget: number;
    safetySpent: number;
    toolsBudget: number;
    toolsSpent: number;
    fuelBudget: number;
    fuelSpent: number;
    ppeBudget: number;
    ppeSpent: number;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getUtilizationColor = (percent: number) => {
  if (percent >= 100) return "text-destructive";
  if (percent >= 80) return "text-yellow-600";
  return "text-emerald-600";
};

const getProgressColor = (percent: number) => {
  if (percent >= 100) return "bg-destructive";
  if (percent >= 80) return "bg-yellow-500";
  return "bg-emerald-500";
};

interface CategoryCardProps {
  title: string;
  icon: React.ReactNode;
  budget: number;
  spent: number;
  iconBg: string;
}

function CategoryCard({ title, icon, budget, spent, iconBg }: CategoryCardProps) {
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const remaining = budget - spent;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            {icon}
          </div>
          <span className={`text-sm font-medium ${getUtilizationColor(percent)}`}>
            {percent}%
          </span>
        </div>
        <h3 className="font-medium text-sm text-foreground mb-1">{title}</h3>
        <p className="text-lg font-bold text-foreground mb-2">
          {formatCurrency(spent)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(budget)}</span>
        </p>
        <Progress 
          value={Math.min(percent, 100)} 
          className={`h-2 ${getProgressColor(percent)}`}
        />
        <p className="text-xs text-muted-foreground mt-2">
          {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}
        </p>
      </CardContent>
    </Card>
  );
}

export function BudgetCategoryCards({ stats }: BudgetCategoryCardsProps) {
  const categories = [
    {
      title: "Total Budget",
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
      budget: stats.totalBudget,
      spent: stats.totalSpent,
      iconBg: "bg-blue-100",
    },
    {
      title: "Parts & Materials",
      icon: <Package className="h-5 w-5 text-purple-600" />,
      budget: stats.partsBudget,
      spent: stats.partsSpent,
      iconBg: "bg-purple-100",
    },
    {
      title: "Labor Costs",
      icon: <Users className="h-5 w-5 text-indigo-600" />,
      budget: stats.laborBudget,
      spent: stats.laborSpent,
      iconBg: "bg-indigo-100",
    },
    {
      title: "Safety & Compliance",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
      budget: stats.safetyBudget,
      spent: stats.safetySpent,
      iconBg: "bg-emerald-100",
    },
    {
      title: "Tools & Equipment",
      icon: <Wrench className="h-5 w-5 text-orange-600" />,
      budget: stats.toolsBudget,
      spent: stats.toolsSpent,
      iconBg: "bg-orange-100",
    },
    {
      title: "Fuels & Lubricants",
      icon: <Fuel className="h-5 w-5 text-amber-600" />,
      budget: stats.fuelBudget,
      spent: stats.fuelSpent,
      iconBg: "bg-amber-100",
    },
    {
      title: "PPE Equipment",
      icon: <HardHat className="h-5 w-5 text-red-600" />,
      budget: stats.ppeBudget,
      spent: stats.ppeSpent,
      iconBg: "bg-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {categories.map((category) => (
        <CategoryCard
          key={category.title}
          title={category.title}
          icon={category.icon}
          budget={category.budget}
          spent={category.spent}
          iconBg={category.iconBg}
        />
      ))}
    </div>
  );
}
