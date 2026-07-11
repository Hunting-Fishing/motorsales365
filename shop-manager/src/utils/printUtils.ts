
/**
 * Print an element by its id
 * @param elementId The id of the element to print
 * @param title Optional title for the print window
 */
export const printElement = (elementId: string, title?: string): void => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this website to print content');
    return;
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || 'Print Document'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 2rem;
            line-height: 1.5;
          }
          .print-header {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #ccc;
          }
          .print-date {
            margin-top: 1rem;
            color: #666;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title || 'Print Document'}</h1>
          <div class="print-date">Generated on: ${new Date().toLocaleString()}</div>
        </div>
        ${element.innerHTML}
      </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load
  printWindow.setTimeout(() => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  }, 500);
};
