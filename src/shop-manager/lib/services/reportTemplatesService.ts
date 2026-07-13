import { supabase } from "@/integrations/supabase/client";

export interface ReportTemplate {
  key: string;
  name: string;
  description: string;
  template_type: string;
  template_content: any;
  is_active: boolean;
}

class ReportTemplatesService {
  private shopId: string | null = null;

  private async ensureShopId(): Promise<string> {
    if (this.shopId) return this.shopId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: profile } = await supabase
      .from("profiles")
      .select("shop_id")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) throw new Error("Shop not found");
    
    this.shopId = profile.shop_id;
    return this.shopId;
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    const shopId = await this.ensureShopId();
    
    const { data, error } = await supabase.rpc('get_report_templates', {
      p_shop_id: shopId
    });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      key: item.key,
      ...item.template_data
    }));
  }

  async createTemplate(template: Omit<ReportTemplate, 'key'>): Promise<void> {
    const shopId = await this.ensureShopId();
    
    // Generate key from name
    const key = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    const templateData = {
      name: template.name,
      description: template.description,
      template_type: template.template_type,
      template_content: template.template_content,
      is_active: template.is_active
    };

    const { error } = await supabase.rpc('set_report_template', {
      p_shop_id: shopId,
      p_key: key,
      p_template_data: templateData
    });

    if (error) throw error;
  }

  async updateTemplate(key: string, template: Partial<ReportTemplate>): Promise<void> {
    const shopId = await this.ensureShopId();

    // Get current template data
    const templates = await this.getTemplates();
    const currentTemplate = templates.find(t => t.key === key);
    if (!currentTemplate) throw new Error("Template not found");

    const updatedData = {
      ...currentTemplate,
      ...template
    };

    const { error } = await supabase.rpc('set_report_template', {
      p_shop_id: shopId,
      p_key: key,
      p_template_data: updatedData
    });

    if (error) throw error;
  }

  async deleteTemplate(key: string): Promise<void> {
    const shopId = await this.ensureShopId();

    const { error } = await supabase
      .from('unified_settings')
      .delete()
      .eq('shop_id', shopId)
      .eq('category', 'report_templates')
      .eq('key', key);

    if (error) throw error;
  }

  async initializeDefaultTemplates(): Promise<void> {
    const shopId = await this.ensureShopId();

    const defaultTemplates = [
      {
        key: 'annual_impact_report',
        name: "Annual Impact Report",
        description: "Comprehensive report showing annual impact metrics and achievements",
        template_type: "impact",
        template_content: {
          sections: [
            { title: "Executive Summary", type: "text", required: true },
            { title: "Program Outcomes", type: "metrics", required: true },
            { title: "Financial Overview", type: "financial", required: true },
            { title: "Volunteer Impact", type: "volunteer_stats", required: false },
            { title: "Donor Recognition", type: "donor_list", required: false }
          ]
        },
        is_active: true
      },
      {
        key: 'grant_application_report',
        name: "Grant Application Report",
        description: "Template for grant applications and progress reports",
        template_type: "grant",
        template_content: {
          sections: [
            { title: "Project Description", type: "text", required: true },
            { title: "Budget Breakdown", type: "budget", required: true },
            { title: "Timeline & Milestones", type: "timeline", required: true },
            { title: "Expected Outcomes", type: "metrics", required: true },
            { title: "Organization Capacity", type: "capacity", required: false }
          ]
        },
        is_active: true
      },
      {
        key: 'board_meeting_report',
        name: "Board Meeting Report",
        description: "Regular board meeting reports with financial and operational updates",
        template_type: "board",
        template_content: {
          sections: [
            { title: "Financial Summary", type: "financial", required: true },
            { title: "Program Updates", type: "program_status", required: true },
            { title: "Volunteer Metrics", type: "volunteer_stats", required: false },
            { title: "Upcoming Events", type: "events", required: false },
            { title: "Action Items", type: "action_items", required: true }
          ]
        },
        is_active: true
      }
    ];

    // Initialize each template
    for (const template of defaultTemplates) {
      const { key, ...templateData } = template;
      await this.createTemplate(templateData);
    }
  }
}

export const reportTemplatesService = new ReportTemplatesService();