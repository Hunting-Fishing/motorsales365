
export const formatEstimatedTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

export const calculateTotalPrice = (services: Array<{ price?: number }>): number => {
  return services.reduce((total, service) => total + (service.price || 0), 0);
};

export const calculateTotalTime = (services: Array<{ estimatedTime?: number }>): number => {
  return services.reduce((total, service) => total + (service.estimatedTime || 0), 0);
};
