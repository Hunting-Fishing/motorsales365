
import { supabase } from '@/integrations/supabase/client';
import type { SectorFiles, StorageFile } from '@/types/service';

export async function getStorageBucketInfo() {
  try {
    console.log('Getting storage bucket information...');
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      throw new Error(`Failed to list buckets: ${error.message}`);
    }
    
    return {
      buckets: buckets || [],
      serviceBucket: buckets?.find(bucket => bucket.name === 'service-data')
    };
  } catch (error) {
    console.error('Error getting storage bucket info:', error);
    throw error;
  }
}

export async function getFolderFiles(folderPath: string): Promise<StorageFile[]> {
  try {
    console.log(`Getting files from folder: ${folderPath}`);
    
    const { data: files, error } = await supabase.storage
      .from('service-data')
      .list(folderPath, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    
    if (error) {
      console.error(`Error listing files in folder ${folderPath}:`, error);
      throw new Error(`Failed to list files in folder ${folderPath}: ${error.message}`);
    }
    
    if (!files) {
      return [];
    }
    
    // Filter for Excel files only and map to StorageFile interface
    return files
      .filter(file => {
        const fileName = file.name.toLowerCase();
        return file.metadata && (
          fileName.endsWith('.xlsx') || 
          fileName.endsWith('.xls')
        );
      })
      .map(file => ({
        name: file.name,
        path: `${folderPath}/${file.name}`,
        size: file.metadata?.size,
        type: file.metadata?.mimetype,
        lastModified: new Date(file.updated_at),
        id: file.id,
        updated_at: file.updated_at,
        created_at: file.created_at,
        last_accessed_at: file.last_accessed_at,
        metadata: file.metadata
      }));
      
  } catch (error) {
    console.error(`Error getting folder files for ${folderPath}:`, error);
    throw error;
  }
}

export async function getAllSectorFiles(): Promise<SectorFiles[]> {
  try {
    console.log('Getting all sector files from service-data bucket...');
    
    // Check if the bucket exists
    const { buckets, serviceBucket } = await getStorageBucketInfo();
    
    if (!serviceBucket) {
      console.log('service-data bucket not found. It should exist from the migration.');
      return [];
    }
    
    // List all folders (sectors) in the bucket
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('service-data')
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    
    if (rootError) {
      console.error('Error listing root folder:', rootError);
      throw new Error(`Failed to list files in service-data bucket: ${rootError.message}`);
    }
    
    if (!rootFiles || rootFiles.length === 0) {
      console.log('No files or folders found in service-data bucket');
      return [];
    }
    
    // Filter for folders (sectors) - folders don't have metadata
    const sectorFolders = rootFiles.filter(item => !item.metadata);
    console.log('Found sector folders:', sectorFolders.map(f => f.name));
    
    const sectorFiles: SectorFiles[] = [];
    
    // For each sector folder, get the Excel files
    for (const folder of sectorFolders) {
      try {
        console.log(`Processing sector folder: ${folder.name}`);
        
        const excelFiles = await getFolderFiles(folder.name);
        
        if (excelFiles.length > 0) {
          sectorFiles.push({
            sectorName: folder.name,
            excelFiles,
            totalFiles: excelFiles.length
          });
          
          console.log(`Added sector: ${folder.name} with ${excelFiles.length} Excel files`);
        }
      } catch (error) {
        console.error(`Error processing folder ${folder.name}:`, error);
        continue;
      }
    }
    
    console.log(`Retrieved ${sectorFiles.length} sectors with Excel files`);
    return sectorFiles;
  } catch (error) {
    console.error('Error getting all sector files:', error);
    throw error;
  }
}

export async function getPublicUrl(filePath: string): Promise<string> {
  try {
    const { data } = supabase.storage
      .from('service-data')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    throw error;
  }
}
