import * as XLSX from 'xlsx';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob, ExcelRowData } from '@/types/service';

// Export the main parsing function with the correct name
export function parseExcelFile(file: File): Promise<ServiceMainCategory[]> {
  return parseExcelToServiceCategories(file);
}

export function parseExcelToServiceCategories(file: File): Promise<ServiceMainCategory[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e: any) => {
      try {
        console.log('Starting Excel file parsing with enhanced processing...');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        const categories: ServiceMainCategory[] = [];
        let categoryIndex = 0;

        for (const sheetName of workbook.SheetNames) {
          console.log(`Processing sheet: ${sheetName}`);
          const worksheet = workbook.Sheets[sheetName];
          
          // Get the full range of the worksheet to ensure we capture all data
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          console.log(`Sheet range: ${worksheet['!ref']}, processing ${range.e.r + 1} rows`);
          
          const aoa = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',
            range: 0, // Process from beginning
            // Remove any artificial limits
            raw: false
          }) as any[][];

          if (!aoa || aoa.length < 2) {
            console.warn(`Sheet "${sheetName}" is empty or has an invalid format.`);
            continue;
          }

          // Get subcategory names from first row (starting from column B)
          const subcategoryNames: string[] = aoa[0].slice(1).filter(name => name && name.toString().trim());
          console.log(`Found ${subcategoryNames.length} subcategories: ${subcategoryNames.join(', ')}`);

          // Create subcategories
          const subcategories: ServiceSubcategory[] = subcategoryNames.map(name => ({
            id: crypto.randomUUID(),
            name: name.toString().trim(),
            description: '',
            jobs: []
          }));

          // Process ALL job data (starting from row 2) - no artificial limits
          const jobsData: string[][] = aoa.slice(1);
          console.log(`Processing ${jobsData.length} job rows for sheet: ${sheetName}`);
          
          let processedJobs = 0;
          for (const rowData of jobsData) {
            if (!rowData[0] || !rowData[0].toString().trim()) continue;

            const jobName = rowData[0].toString().trim();
            
            // Process each subcategory column
            for (let i = 1; i < rowData.length && i <= subcategoryNames.length; i++) {
              const jobDescription = rowData[i] ? rowData[i].toString().trim() : '';
              if (!jobDescription) continue;

              const subcategoryIndex = i - 1;
              if (subcategoryIndex < subcategories.length) {
                subcategories[subcategoryIndex].jobs.push({
                  id: crypto.randomUUID(),
                  name: jobDescription,
                  description: jobName,
                  estimatedTime: 60,
                  price: 50
                });
                processedJobs++;
              }
            }

            // Reduce delay frequency for better performance
            if (jobsData.indexOf(rowData) % 50 === 0 && jobsData.indexOf(rowData) > 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }

          categories.push({
            id: crypto.randomUUID(),
            name: sheetName,
            description: '',
            subcategories: subcategories,
            position: categoryIndex++
          });

          const totalJobsInCategory = subcategories.reduce((acc, sub) => acc + sub.jobs.length, 0);
          console.log(`Completed processing sheet: ${sheetName} with ${subcategories.length} subcategories and ${totalJobsInCategory} total jobs`);
        }

        const totalServices = categories.reduce((acc, cat) => 
          acc + cat.subcategories.reduce((subAcc, sub) => subAcc + sub.jobs.length, 0), 0);
        
        console.log(`Excel parsing completed. Total categories: ${categories.length}, Total services: ${totalServices}`);
        resolve(categories);

      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

// Export with the correct name
export function generateExcelTemplate(): ArrayBuffer {
  return generateServiceTemplate();
}

export function generateServiceTemplate(): ArrayBuffer {
  console.log('Generating service template...');
  
  const workbook = XLSX.utils.book_new();
  
  // Sample data for demonstration
  const sampleCategories = [
    {
      name: 'Automotive Services',
      subcategories: ['Oil Change', 'Brake Service', 'Engine Repair'],
      jobs: [
        ['Basic Oil Change', 'Synthetic Oil Change', 'Oil Filter Replacement'],
        ['Brake Pad Replacement', 'Brake Rotor Service', 'Brake Fluid Flush'],
        ['Engine Diagnostics', 'Engine Tune-up', 'Engine Overhaul']
      ]
    },
    {
      name: 'Electrical Services', 
      subcategories: ['Battery Service', 'Alternator Service', 'Wiring'],
      jobs: [
        ['Battery Test', 'Battery Replacement', 'Battery Cleaning'],
        ['Alternator Test', 'Alternator Replacement', 'Alternator Repair'],
        ['Wire Repair', 'Harness Replacement', 'Electrical Diagnostics']
      ]
    }
  ];
  
  sampleCategories.forEach(category => {
    console.log(`Creating sheet for category: ${category.name}`);
    
    // Create worksheet data
    const wsData: any[][] = [];
    
    // Header row (row 1): empty cell in A1, then subcategory names
    const headerRow = ['', ...category.subcategories];
    wsData.push(headerRow);
    
    // Find the maximum number of jobs in any subcategory
    const maxJobs = Math.max(...category.jobs.map(jobList => jobList.length));
    
    // Data rows: jobs for each subcategory
    for (let i = 0; i < maxJobs; i++) {
      const dataRow = [''];
      category.jobs.forEach(jobList => {
        dataRow.push(jobList[i] || '');
      });
      wsData.push(dataRow);
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, category.name);
  });
  
  // Write workbook to ArrayBuffer using correct XLSX API
  console.log('Writing workbook to buffer...');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  
  console.log('Template generated successfully');
  return buffer;
}
