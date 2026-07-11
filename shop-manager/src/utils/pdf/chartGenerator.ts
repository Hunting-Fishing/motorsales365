
import html2canvas from 'html2canvas';

/**
 * Converts a chart DOM element to a base64 image
 * @param chartElement The DOM element containing the chart
 * @returns A Promise resolving to the base64 image string
 */
export const chartToBase64 = async (chartElement: HTMLElement): Promise<string> => {
  if (!chartElement) {
    throw new Error('Chart element not found');
  }
  
  try {
    const canvas = await html2canvas(chartElement, {
      scale: 2, // Higher scale for better quality
      backgroundColor: null,
      logging: false
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating chart image:', error);
    throw error;
  }
};

/**
 * Creates a simple canvas chart as a fallback when no DOM element is available
 * @param data The data for the chart
 * @param type The type of chart ('bar', 'pie', etc.)
 * @returns A base64 image string of the generated chart
 */
export const generateFallbackChart = (
  data: Array<{name: string, value: number}>, 
  type: 'bar' | 'pie' | 'line' = 'bar'
): string => {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (type === 'bar') {
    drawBarChart(ctx, data, canvas.width, canvas.height);
  } else if (type === 'pie') {
    drawPieChart(ctx, data, canvas.width, canvas.height);
  } else if (type === 'line') {
    drawLineChart(ctx, data, canvas.width, canvas.height);
  }
  
  return canvas.toDataURL('image/png');
};

/**
 * Draws a simple bar chart on the canvas
 */
const drawBarChart = (
  ctx: CanvasRenderingContext2D, 
  data: Array<{name: string, value: number}>, 
  width: number, 
  height: number
) => {
  const margin = { top: 40, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Find the maximum value for scaling
  const maxValue = Math.max(...data.map(item => item.value));
  
  // Calculate bar width based on number of data points
  const barWidth = chartWidth / data.length * 0.7;
  const barSpacing = chartWidth / data.length * 0.3;
  
  // Colors
  const colors = ['#4f46e5', '#06b6d4', '#8b5cf6', '#f97316', '#10b981', '#ef4444'];
  
  // Draw title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Data Visualization', width / 2, margin.top / 2);
  
  // Draw bars
  data.forEach((item, index) => {
    const x = margin.left + (barWidth + barSpacing) * index;
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = height - margin.bottom - barHeight;
    
    // Bar
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, x + barWidth / 2, height - margin.bottom + 20);
    
    // Value
    ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
  });
  
  // Draw axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.stroke();
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();
};

/**
 * Draws a simple pie chart on the canvas
 */
const drawPieChart = (
  ctx: CanvasRenderingContext2D, 
  data: Array<{name: string, value: number}>, 
  width: number, 
  height: number
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) * 0.7;
  
  // Colors
  const colors = ['#4f46e5', '#06b6d4', '#8b5cf6', '#f97316', '#10b981', '#ef4444'];
  
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Draw title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Data Visualization', width / 2, 20);
  
  // Draw pie slices
  let startAngle = 0;
  
  data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    // Slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    
    // Label (outside the pie)
    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 1.2;
    const labelX = centerX + Math.cos(labelAngle) * labelRadius;
    const labelY = centerY + Math.sin(labelAngle) * labelRadius;
    
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.name}: ${Math.round((item.value / total) * 100)}%`, labelX, labelY);
    
    startAngle = endAngle;
  });
};

/**
 * Draws a simple line chart on the canvas
 */
const drawLineChart = (
  ctx: CanvasRenderingContext2D, 
  data: Array<{name: string, value: number}>, 
  width: number, 
  height: number
) => {
  const margin = { top: 40, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Find the maximum value for scaling
  const maxValue = Math.max(...data.map(item => item.value));
  
  // Draw title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Data Visualization', width / 2, margin.top / 2);
  
  // Draw axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.stroke();
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();
  
  // Draw the line
  ctx.beginPath();
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2;
  
  data.forEach((item, index) => {
    const x = margin.left + (chartWidth / (data.length - 1)) * index;
    const y = height - margin.bottom - (item.value / maxValue) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    // Draw point
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, x, height - margin.bottom + 20);
  });
  
  ctx.stroke();
};
