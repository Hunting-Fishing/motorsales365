
import { WorkOrderTemplateRepository, WorkOrderTemplate, CreateWorkOrderTemplateInput, UpdateWorkOrderTemplateInput } from '@/lib/database/repositories/WorkOrderTemplateRepository';

export class WorkOrderTemplateService {
  private repository: WorkOrderTemplateRepository;

  constructor() {
    this.repository = new WorkOrderTemplateRepository();
  }

  async getActiveTemplates(): Promise<WorkOrderTemplate[]> {
    try {
      return await this.repository.findActive();
    } catch (error) {
      console.error('Error fetching active templates:', error);
      throw new Error('Failed to fetch active templates');
    }
  }

  async createTemplate(templateData: CreateWorkOrderTemplateInput): Promise<WorkOrderTemplate> {
    try {
      return await this.repository.create(templateData);
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  async updateTemplate(id: string, updates: UpdateWorkOrderTemplateInput): Promise<WorkOrderTemplate> {
    try {
      return await this.repository.update(id, updates);
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  async useTemplate(id: string): Promise<WorkOrderTemplate> {
    try {
      return await this.repository.incrementUsage(id);
    } catch (error) {
      console.error('Error incrementing template usage:', error);
      throw new Error('Failed to update template usage');
    }
  }

  async getMostUsedTemplates(limit: number = 10): Promise<WorkOrderTemplate[]> {
    try {
      return await this.repository.getMostUsed(limit);
    } catch (error) {
      console.error('Error fetching most used templates:', error);
      throw new Error('Failed to fetch most used templates');
    }
  }

  async getTemplatesByCategory(categoryId: string): Promise<WorkOrderTemplate[]> {
    try {
      return await this.repository.findByCategory(categoryId);
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      throw new Error('Failed to fetch templates by category');
    }
  }

  async getTemplateById(id: string): Promise<WorkOrderTemplate | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      console.error('Error fetching template by ID:', error);
      throw new Error('Failed to fetch template by ID');
    }
  }
}
