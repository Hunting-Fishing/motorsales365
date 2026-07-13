
import { supabase } from '@/integrations/supabase/client';

export interface StorageFile {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
}

export interface StorageFolder {
  name: string;
  path: string;
  lastModified: Date;
}

export interface BucketInfo {
  exists: boolean;
  files: StorageFile[];
  folders: StorageFolder[];
}

export interface SectorFiles {
  sectorName: string;
  excelFiles: StorageFile[];
  totalFiles: number;
}

class UnifiedStorageService {
  async getBucketInfo(bucketName: string): Promise<BucketInfo> {
    try {
      console.log(`Fetching bucket info for: ${bucketName}`);
      
      // Fetch ALL items using pagination - no limits
      const allItems = await this.fetchAllItems(bucketName, '');
      
      if (!allItems || allItems.length === 0) {
        console.warn(`No items found in bucket: ${bucketName}`);
        return {
          exists: false,
          files: [],
          folders: []
        };
      }

      const files: StorageFile[] = [];
      const folders: StorageFolder[] = [];

      for (const item of allItems) {
        if (item.name && item.name !== '.emptyFolderPlaceholder') {
          const itemData = {
            name: item.name,
            path: item.name,
            lastModified: item.updated_at ? new Date(item.updated_at) : new Date()
          };

          if (item.metadata && 'size' in item.metadata) {
            // It's a file
            files.push({
              ...itemData,
              size: item.metadata.size as number,
              type: item.metadata.mimetype as string || 'application/octet-stream'
            });
          } else {
            // It's a folder
            folders.push(itemData);
          }
        }
      }

      console.log(`Found ${files.length} files and ${folders.length} folders in bucket: ${bucketName}`);
      
      return {
        exists: true,
        files,
        folders
      };
    } catch (error) {
      console.error('Error in getBucketInfo:', error);
      return {
        exists: false,
        files: [],
        folders: []
      };
    }
  }

  private async fetchAllItems(bucketName: string, path: string): Promise<any[]> {
    const allItems: any[] = [];
    let offset = 0;
    const batchSize = 1000; // Process in batches but fetch everything
    let hasMore = true;

    while (hasMore) {
      try {
        console.log(`Fetching batch: offset ${offset}, limit ${batchSize} for path: ${path}`);
        
        const { data: items, error } = await supabase.storage
          .from(bucketName)
          .list(path, {
            limit: batchSize,
            offset: offset,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          console.error(`Error fetching batch at offset ${offset}:`, error);
          break;
        }

        if (!items || items.length === 0) {
          hasMore = false;
          break;
        }

        allItems.push(...items);
        
        // If we got fewer items than the batch size, we've reached the end
        if (items.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
        
        console.log(`Fetched ${items.length} items, total so far: ${allItems.length}`);
      } catch (error) {
        console.error(`Error in batch fetch at offset ${offset}:`, error);
        break;
      }
    }

    console.log(`Total items fetched: ${allItems.length}`);
    return allItems;
  }

  async getFilesInFolder(
    bucketName: string, 
    folderPath: string, 
    allowedExtensions: string[] = []
  ): Promise<StorageFile[]> {
    try {
      console.log(`Fetching all files in folder: ${folderPath}`);
      
      // Fetch ALL files in the folder using pagination
      const allItems = await this.fetchAllItems(bucketName, folderPath);
      
      if (!allItems || allItems.length === 0) {
        console.warn(`No items found in folder: ${folderPath}`);
        return [];
      }

      const files: StorageFile[] = [];

      for (const item of allItems) {
        if (!item.name || item.name === '.emptyFolderPlaceholder') {
          continue;
        }

        // Check if it's a file (has metadata with size)
        if (item.metadata && 'size' in item.metadata) {
          const fileName = item.name.toLowerCase();
          
          // Filter by allowed extensions if specified
          if (allowedExtensions.length > 0) {
            const hasAllowedExtension = allowedExtensions.some(ext => 
              fileName.endsWith(ext.toLowerCase())
            );
            if (!hasAllowedExtension) {
              continue;
            }
          }

          files.push({
            name: item.name,
            path: `${folderPath}/${item.name}`,
            size: item.metadata.size as number,
            type: item.metadata.mimetype as string || 'application/octet-stream',
            lastModified: item.updated_at ? new Date(item.updated_at) : new Date()
          });
        }
      }

      console.log(`Found ${files.length} files in folder: ${folderPath}`);
      return files;
    } catch (error) {
      console.error(`Error in getFilesInFolder for ${folderPath}:`, error);
      return [];
    }
  }

  async getAllSectorFiles(bucketName: string): Promise<SectorFiles[]> {
    try {
      console.log(`Getting all sector files from bucket: ${bucketName}`);
      
      // First get all folders (sectors)
      const bucketInfo = await this.getBucketInfo(bucketName);
      
      if (!bucketInfo.exists || bucketInfo.folders.length === 0) {
        console.warn('No sectors found in bucket');
        return [];
      }

      console.log(`Found ${bucketInfo.folders.length} sector folders`);
      const sectorFiles: SectorFiles[] = [];

      // Process each sector folder with unlimited file processing
      for (const folder of bucketInfo.folders) {
        console.log(`Processing sector: ${folder.name}`);
        
        const excelFiles = await this.getFilesInFolder(bucketName, folder.name, ['.xlsx']);
        
        console.log(`Sector ${folder.name}: found ${excelFiles.length} Excel files`);
        
        sectorFiles.push({
          sectorName: folder.name,
          excelFiles,
          totalFiles: excelFiles.length
        });
      }

      // Sort by sector name for consistent display
      sectorFiles.sort((a, b) => a.sectorName.localeCompare(b.sectorName));

      const totalFiles = sectorFiles.reduce((sum, sector) => sum + sector.totalFiles, 0);
      console.log(`Total Excel files found across all sectors: ${totalFiles}`);
      
      return sectorFiles;
    } catch (error) {
      console.error('Error in getAllSectorFiles:', error);
      return [];
    }
  }

  async downloadFile(bucketName: string, filePath: string): Promise<Blob | null> {
    try {
      console.log(`Downloading file: ${filePath}`);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        console.error(`Error downloading file ${filePath}:`, error);
        return null;
      }

      console.log(`Successfully downloaded file: ${filePath}`);
      return data;
    } catch (error) {
      console.error(`Error in downloadFile for ${filePath}:`, error);
      return null;
    }
  }
}

export const storageService = new UnifiedStorageService();
