-- Seed Form Categories (simple insert, will fail silently if exists due to trigger)
DO $$
BEGIN
  INSERT INTO form_categories (name, description) VALUES
    ('Vehicle Intake', 'Forms for vehicle intake and inspection'),
    ('Authorization', 'Customer authorization and consent forms'),
    ('Safety', 'Safety inspection and compliance forms'),
    ('Equipment', 'Equipment logs and inspections'),
    ('Daily Operations', 'Daily operational forms and logs');
EXCEPTION WHEN unique_violation THEN
  -- Categories already exist, continue
  NULL;
END $$;

-- Seed Form Templates (simple insert)
DO $$
BEGIN
  INSERT INTO form_templates (name, description, category, is_published, version) VALUES
    ('Vehicle Intake Inspection', 'Pre-service vehicle condition assessment checklist', 'Vehicle Intake', true, 1),
    ('Work Order Authorization', 'Customer signature for service approval', 'Authorization', true, 1),
    ('Customer Consent Form', 'General authorization and consent', 'Authorization', true, 1),
    ('Safety Inspection Checklist', 'OSHA compliance safety inspection', 'Safety', true, 1),
    ('Daily Equipment Log', 'Equipment hours and condition tracking', 'Equipment', true, 1),
    ('Pre-Trip Vehicle Inspection', 'DOT DVIR pre-trip inspection form', 'Safety', true, 1);
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- Vehicle Intake Inspection Sections
INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Vehicle Information', 'Basic vehicle details', 1 FROM form_templates WHERE name = 'Vehicle Intake Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Vehicle Intake Inspection') AND title = 'Vehicle Information');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Exterior Condition', 'Exterior inspection points', 2 FROM form_templates WHERE name = 'Vehicle Intake Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Vehicle Intake Inspection') AND title = 'Exterior Condition');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Interior Condition', 'Interior inspection points', 3 FROM form_templates WHERE name = 'Vehicle Intake Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Vehicle Intake Inspection') AND title = 'Interior Condition');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Customer Concerns', 'Customer reported issues', 4 FROM form_templates WHERE name = 'Vehicle Intake Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Vehicle Intake Inspection') AND title = 'Customer Concerns');

-- Work Order Authorization Sections
INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Service Details', 'Work to be performed', 1 FROM form_templates WHERE name = 'Work Order Authorization'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Work Order Authorization') AND title = 'Service Details');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Cost Authorization', 'Estimated costs and approval', 2 FROM form_templates WHERE name = 'Work Order Authorization'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Work Order Authorization') AND title = 'Cost Authorization');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Customer Authorization', 'Customer signature', 3 FROM form_templates WHERE name = 'Work Order Authorization'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Work Order Authorization') AND title = 'Customer Authorization');

-- Safety Inspection Sections
INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'PPE Inspection', 'Personal protective equipment check', 1 FROM form_templates WHERE name = 'Safety Inspection Checklist'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Safety Inspection Checklist') AND title = 'PPE Inspection');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Work Area Safety', 'Workspace safety inspection', 2 FROM form_templates WHERE name = 'Safety Inspection Checklist'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Safety Inspection Checklist') AND title = 'Work Area Safety');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Equipment Safety', 'Tool and equipment safety', 3 FROM form_templates WHERE name = 'Safety Inspection Checklist'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Safety Inspection Checklist') AND title = 'Equipment Safety');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Sign Off', 'Inspector signature', 4 FROM form_templates WHERE name = 'Safety Inspection Checklist'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Safety Inspection Checklist') AND title = 'Sign Off');

-- Equipment Log Sections
INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Equipment Details', 'Equipment identification', 1 FROM form_templates WHERE name = 'Daily Equipment Log'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Daily Equipment Log') AND title = 'Equipment Details');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Usage Log', 'Hours and operation details', 2 FROM form_templates WHERE name = 'Daily Equipment Log'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Daily Equipment Log') AND title = 'Usage Log');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Condition Report', 'Equipment condition assessment', 3 FROM form_templates WHERE name = 'Daily Equipment Log'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Daily Equipment Log') AND title = 'Condition Report');

-- Pre-Trip Inspection Sections
INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Vehicle Identification', 'Vehicle and driver info', 1 FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection') AND title = 'Vehicle Identification');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Engine Compartment', 'Under hood inspection', 2 FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection') AND title = 'Engine Compartment');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Cab/Interior', 'Interior inspection points', 3 FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection') AND title = 'Cab/Interior');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Exterior/Lights', 'External inspection', 4 FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection') AND title = 'Exterior/Lights');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Certification', 'Driver certification', 5 FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Pre-Trip Vehicle Inspection') AND title = 'Certification');

-- Customer Consent Sections
INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Customer Information', 'Customer details', 1 FROM form_templates WHERE name = 'Customer Consent Form'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Customer Consent Form') AND title = 'Customer Information');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Consent Terms', 'Terms and conditions', 2 FROM form_templates WHERE name = 'Customer Consent Form'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Customer Consent Form') AND title = 'Consent Terms');

INSERT INTO form_sections (template_id, title, description, display_order)
SELECT id, 'Acknowledgment', 'Customer acknowledgment', 3 FROM form_templates WHERE name = 'Customer Consent Form'
AND NOT EXISTS (SELECT 1 FROM form_sections WHERE template_id = (SELECT id FROM form_templates WHERE name = 'Customer Consent Form') AND title = 'Acknowledgment');