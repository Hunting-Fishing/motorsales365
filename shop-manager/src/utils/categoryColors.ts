
// Category color utilities for service management
export const categoryColors = [
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-green-100 text-green-800 border-green-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-yellow-100 text-yellow-800 border-yellow-300',
  'bg-red-100 text-red-800 border-red-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
];

export const getCategoryColor = (categoryName: string): string => {
  // Generate a consistent color index based on category name
  const hash = categoryName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colorIndex = Math.abs(hash) % categoryColors.length;
  return categoryColors[colorIndex];
};

export const getMatchTypeColor = (matchType: string): string => {
  switch (matchType) {
    case 'exact':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'exact_words':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'similar':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'partial':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};
