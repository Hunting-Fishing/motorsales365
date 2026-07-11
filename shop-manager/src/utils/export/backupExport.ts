
import { utils, write } from "xlsx";
import { getFormattedDate } from './utils';

/**
 * Create a full system backup (for admin use)
 */
export const createSystemBackup = (
  entityData: Record<string, any[]>, 
  filename: string = "System_Backup"
) => {
  try {
    // Check if data is provided
    if (!entityData || Object.keys(entityData).length === 0) {
      throw new Error('No data provided for backup');
    }
    
    // Create a workbook for the backup
    const workbook = utils.book_new();
    
    // Add metadata sheet with backup information
    const metadataWorksheet = utils.json_to_sheet([{
      backupDate: new Date().toISOString(),
      dataVersion: '1.0',
      systemVersion: 'Auto Shop Management System v1.0',
      totalEntities: Object.keys(entityData).length,
      totalRecords: Object.values(entityData).reduce((acc, val) => acc + val.length, 0)
    }]);
    utils.book_append_sheet(workbook, metadataWorksheet, 'Backup_Metadata');
    
    // Add each entity type as a separate worksheet
    Object.entries(entityData).forEach(([entityName, entityRecords]) => {
      if (entityRecords.length > 0) {
        const worksheet = utils.json_to_sheet(entityRecords);
        utils.book_append_sheet(workbook, worksheet, entityName);
      }
    });
    
    // Generate file and trigger download
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${getFormattedDate()}.xlsx`;
    link.click();
    
    return true;
  } catch (err) {
    console.error('Failed to create system backup:', err);
    throw new Error('Failed to create system backup');
  }
};
