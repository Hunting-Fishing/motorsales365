
// Section color coordination for sidebar navigation
export interface SectionColorScheme {
  background: string;
  text: string;
  hover: string;
  active: string;
  header: string;
  headerText: string;
  icon: string;
  border: string;
}

export const sectionColorSchemes: Record<string, SectionColorScheme> = {
  'Dashboard': {
    background: 'bg-blue-50',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-100',
    active: 'bg-blue-200 text-blue-900',
    header: 'bg-gradient-to-r from-blue-100 to-blue-50',
    headerText: 'text-blue-800',
    icon: 'text-blue-600',
    border: 'border-blue-200'
  },
  'Customers': {
    background: 'bg-green-50',
    text: 'text-green-700',
    hover: 'hover:bg-green-100',
    active: 'bg-green-200 text-green-900',
    header: 'bg-gradient-to-r from-green-100 to-green-50',
    headerText: 'text-green-800',
    icon: 'text-green-600',
    border: 'border-green-200'
  },
  'Inventory': {
    background: 'bg-orange-50',
    text: 'text-orange-700',
    hover: 'hover:bg-orange-100',
    active: 'bg-orange-200 text-orange-900',
    header: 'bg-gradient-to-r from-orange-100 to-orange-50',
    headerText: 'text-orange-800',
    icon: 'text-orange-600',
    border: 'border-orange-200'
  },
  'Scheduling': {
    background: 'bg-purple-50',
    text: 'text-purple-700',
    hover: 'hover:bg-purple-100',
    active: 'bg-purple-200 text-purple-900',
    header: 'bg-gradient-to-r from-purple-100 to-purple-50',
    headerText: 'text-purple-800',
    icon: 'text-purple-600',
    border: 'border-purple-200'
  },
  'Communications': {
    background: 'bg-cyan-50',
    text: 'text-cyan-700',
    hover: 'hover:bg-cyan-100',
    active: 'bg-cyan-200 text-cyan-900',
    header: 'bg-gradient-to-r from-cyan-100 to-cyan-50',
    headerText: 'text-cyan-800',
    icon: 'text-cyan-600',
    border: 'border-cyan-200'
  },
  'Operations': {
    background: 'bg-red-50',
    text: 'text-red-700',
    hover: 'hover:bg-red-100',
    active: 'bg-red-200 text-red-900',
    header: 'bg-gradient-to-r from-red-100 to-red-50',
    headerText: 'text-red-800',
    icon: 'text-red-600',
    border: 'border-red-200'
  },
  'Company': {
    background: 'bg-slate-50',
    text: 'text-slate-700',
    hover: 'hover:bg-slate-100',
    active: 'bg-slate-200 text-slate-900',
    header: 'bg-gradient-to-r from-slate-100 to-slate-50',
    headerText: 'text-slate-800',
    icon: 'text-slate-600',
    border: 'border-slate-200'
  },
  'Services': {
    background: 'bg-yellow-50',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-100',
    active: 'bg-yellow-200 text-yellow-900',
    header: 'bg-gradient-to-r from-yellow-100 to-yellow-50',
    headerText: 'text-yellow-800',
    icon: 'text-yellow-700',
    border: 'border-yellow-200'
  },
  'Store': {
    background: 'bg-pink-50',
    text: 'text-pink-700',
    hover: 'hover:bg-pink-100',
    active: 'bg-pink-200 text-pink-900',
    header: 'bg-gradient-to-r from-pink-100 to-pink-50',
    headerText: 'text-pink-800',
    icon: 'text-pink-600',
    border: 'border-pink-200'
  },
  'Settings': {
    background: 'bg-gray-50',
    text: 'text-gray-700',
    hover: 'hover:bg-gray-100',
    active: 'bg-gray-200 text-gray-900',
    header: 'bg-gradient-to-r from-gray-100 to-gray-50',
    headerText: 'text-gray-800',
    icon: 'text-gray-600',
    border: 'border-gray-200'
  },
  'Support': {
    background: 'bg-emerald-50',
    text: 'text-emerald-700',
    hover: 'hover:bg-emerald-100',
    active: 'bg-emerald-200 text-emerald-900',
    header: 'bg-gradient-to-r from-emerald-100 to-emerald-50',
    headerText: 'text-emerald-800',
    icon: 'text-emerald-600',
    border: 'border-emerald-200'
  },
  'Gunsmith': {
    background: 'bg-amber-50',
    text: 'text-amber-700',
    hover: 'hover:bg-amber-100',
    active: 'bg-amber-200 text-amber-900',
    header: 'bg-gradient-to-r from-amber-100 to-amber-50',
    headerText: 'text-amber-800',
    icon: 'text-amber-600',
    border: 'border-amber-200'
  }
};

export const getSectionColorScheme = (sectionTitle: string): SectionColorScheme => {
  return sectionColorSchemes[sectionTitle] || sectionColorSchemes['Settings']; // fallback to Settings colors
};
