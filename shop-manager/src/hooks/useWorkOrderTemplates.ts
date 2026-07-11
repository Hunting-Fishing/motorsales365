
import { useState, useEffect, useCallback } from 'react';
import { WorkOrderTemplateService } from '@/lib/services/WorkOrderTemplateService';
import { WorkOrderTemplate, CreateWorkOrderTemplateInput, UpdateWorkOrderTemplateInput } from '@/lib/database/repositories/WorkOrderTemplateRepository';

const templateService = new WorkOrderTemplateService();

export function useWorkOrderTemplates() {
  const [templates, setTemplates] = useState<WorkOrderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await templateService.getActiveTemplates();
      setTemplates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      console.error('Error fetching work order templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData: CreateWorkOrderTemplateInput) => {
    try {
      const newTemplate = await templateService.createTemplate(templateData);
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: UpdateWorkOrderTemplateInput) => {
    try {
      const updatedTemplate = await templateService.updateTemplate(id, updates);
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await templateService.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const useTemplate = useCallback(async (templateId: string) => {
    try {
      const updatedTemplate = await templateService.useTemplate(templateId);
      setTemplates(prev => prev.map(t => t.id === templateId ? updatedTemplate : t));
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template usage';
      setError(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate
  };
}
