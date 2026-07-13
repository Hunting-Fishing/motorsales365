
// This file now uses real database data through the WorkOrderTemplateService
import { WorkOrderTemplateService } from '@/lib/services/WorkOrderTemplateService';

const templateService = new WorkOrderTemplateService();

// Export functions that use real database data
export const getWorkOrderTemplates = async () => {
  return await templateService.getActiveTemplates();
};

export const updateTemplateUsage = async (templateId: string) => {
  return await templateService.useTemplate(templateId);
};

export const createTemplate = async (templateData: any) => {
  return await templateService.createTemplate(templateData);
};

export const getTemplateById = async (templateId: string) => {
  return await templateService.getTemplateById(templateId);
};

export const getMostUsedTemplates = async (limit: number = 10) => {
  return await templateService.getMostUsedTemplates(limit);
};

export const getTemplatesByCategory = async (categoryId: string) => {
  return await templateService.getTemplatesByCategory(categoryId);
};

// Remove the mock data export
export const workOrderTemplates = [];
