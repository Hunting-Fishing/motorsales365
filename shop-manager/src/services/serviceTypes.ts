
// Define service types used throughout the application
export const SERVICE_TYPES = [
  'Installation',
  'Maintenance',
  'Repair',
  'Inspection',
  'Diagnosis',
  'Emergency',
  'Upgrade',
  'Consultation',
  'Testing',
  'Other'
];

// Get service type based on work order description
export const getServiceTypeFromDescription = (description: string): string => {
  const lowerDesc = description?.toLowerCase() || '';
  
  if (lowerDesc.includes('install') || lowerDesc.includes('replacement')) {
    return 'Installation';
  } else if (lowerDesc.includes('maintenance') || lowerDesc.includes('tune')) {
    return 'Maintenance';
  } else if (lowerDesc.includes('repair') || lowerDesc.includes('fix')) {
    return 'Repair';
  } else if (lowerDesc.includes('inspect') || lowerDesc.includes('check')) {
    return 'Inspection';
  } else if (lowerDesc.includes('diagnos') || lowerDesc.includes('troubleshoot')) {
    return 'Diagnosis';
  } else if (lowerDesc.includes('emergency') || lowerDesc.includes('urgent')) {
    return 'Emergency';
  } else if (lowerDesc.includes('upgrade') || lowerDesc.includes('improv')) {
    return 'Upgrade';
  } else if (lowerDesc.includes('consult') || lowerDesc.includes('advice')) {
    return 'Consultation';
  } else if (lowerDesc.includes('test') || lowerDesc.includes('evaluat')) {
    return 'Testing';
  } else {
    return 'Other';
  }
};

// Get service color by type for UI display
export const getServiceTypeColor = (serviceType: string): string => {
  switch (serviceType) {
    case 'Installation':
      return 'bg-blue-100 text-blue-800';
    case 'Maintenance':
      return 'bg-green-100 text-green-800';
    case 'Repair':
      return 'bg-amber-100 text-amber-800';
    case 'Inspection':
      return 'bg-indigo-100 text-indigo-800';
    case 'Diagnosis':
      return 'bg-purple-100 text-purple-800';
    case 'Emergency':
      return 'bg-red-100 text-red-800';
    case 'Upgrade':
      return 'bg-cyan-100 text-cyan-800';
    case 'Consultation':
      return 'bg-teal-100 text-teal-800';
    case 'Testing':
      return 'bg-violet-100 text-violet-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
