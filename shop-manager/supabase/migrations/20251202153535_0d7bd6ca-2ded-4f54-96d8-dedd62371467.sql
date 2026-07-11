-- Add fields for Vehicle Intake Inspection - Vehicle Information section
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order, options)
SELECT fs.id, 'Odometer Reading', 'number', 'Enter current mileage', true, 1, NULL
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Vehicle Information'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Odometer Reading');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order, options)
SELECT fs.id, 'Fuel Level', 'select', NULL, true, 2, '[{"label":"Empty","value":"empty"},{"label":"1/4","value":"quarter"},{"label":"1/2","value":"half"},{"label":"3/4","value":"three-quarter"},{"label":"Full","value":"full"}]'::jsonb
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Vehicle Information'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Fuel Level');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Keys Received', 'checkbox', NULL, false, 3
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Vehicle Information'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Keys Received');

-- Exterior Condition fields
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Body Damage Present', 'checkbox', NULL, false, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Exterior Condition'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Body Damage Present');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Damage Description', 'textarea', 'Describe any existing damage', false, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Exterior Condition'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Damage Description');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order, options)
SELECT fs.id, 'Tire Condition', 'select', NULL, true, 3, '[{"label":"Good","value":"good"},{"label":"Fair","value":"fair"},{"label":"Poor","value":"poor"},{"label":"Needs Replacement","value":"replace"}]'::jsonb
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Exterior Condition'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Tire Condition');

-- Customer Concerns fields
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Customer Concerns', 'textarea', 'Describe customer reported issues', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Vehicle Intake Inspection' AND fs.title = 'Customer Concerns'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Customer Concerns');

-- Work Order Authorization fields
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Work Description', 'textarea', 'Describe the work to be performed', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Work Order Authorization' AND fs.title = 'Service Details'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Work Description');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Estimated Total Cost', 'number', 'Enter estimated total', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Work Order Authorization' AND fs.title = 'Cost Authorization'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Estimated Total Cost');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order, options)
SELECT fs.id, 'Payment Method', 'select', NULL, true, 2, '[{"label":"Cash","value":"cash"},{"label":"Credit Card","value":"credit"},{"label":"Check","value":"check"},{"label":"Invoice","value":"invoice"}]'::jsonb
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Work Order Authorization' AND fs.title = 'Cost Authorization'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Payment Method');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Customer Name', 'text', 'Full legal name', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Work Order Authorization' AND fs.title = 'Customer Authorization'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Customer Name');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Customer Signature', 'signature', NULL, true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Work Order Authorization' AND fs.title = 'Customer Authorization'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Customer Signature');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Date', 'date', NULL, true, 3
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Work Order Authorization' AND fs.title = 'Customer Authorization'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Date');

-- Safety Inspection fields
INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Safety Glasses Available', 'checkbox', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Safety Inspection Checklist' AND fs.title = 'PPE Inspection'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Safety Glasses Available');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Gloves Available', 'checkbox', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Safety Inspection Checklist' AND fs.title = 'PPE Inspection'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Gloves Available');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Fire Extinguisher Accessible', 'checkbox', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Safety Inspection Checklist' AND fs.title = 'Work Area Safety'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Fire Extinguisher Accessible');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Emergency Exits Clear', 'checkbox', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Safety Inspection Checklist' AND fs.title = 'Work Area Safety'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Emergency Exits Clear');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Inspector Name', 'text', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Safety Inspection Checklist' AND fs.title = 'Sign Off'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Inspector Name');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Inspector Signature', 'signature', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Safety Inspection Checklist' AND fs.title = 'Sign Off'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Inspector Signature');

-- Pre-Trip fields
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Vehicle Number/ID', 'text', 'Unit number', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Vehicle Identification'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Vehicle Number/ID');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Odometer', 'number', 'Current mileage', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Vehicle Identification'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Odometer');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Oil Level OK', 'checkbox', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Engine Compartment'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Oil Level OK');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Coolant Level OK', 'checkbox', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Engine Compartment'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Coolant Level OK');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Vehicle Safe to Operate', 'checkbox', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Certification'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Vehicle Safe to Operate');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Driver Name', 'text', 'Full name', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Certification'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Driver Name');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Driver Signature', 'signature', true, 3
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Pre-Trip Vehicle Inspection' AND fs.title = 'Certification'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Driver Signature');

-- Customer Consent fields
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Customer Name', 'text', 'Full legal name', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Customer Consent Form' AND fs.title = 'Customer Information'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Customer Name');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Email Address', 'email', 'email@example.com', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Customer Consent Form' AND fs.title = 'Customer Information'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Email Address');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'I agree to the terms and conditions', 'checkbox', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Customer Consent Form' AND fs.title = 'Consent Terms'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'I agree to the terms and conditions');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Customer Signature', 'signature', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Customer Consent Form' AND fs.title = 'Acknowledgment'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Customer Signature');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Date', 'date', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Customer Consent Form' AND fs.title = 'Acknowledgment'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Date');

-- Equipment Log fields
INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Equipment ID/Name', 'text', 'Enter equipment identifier', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Equipment Details'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Equipment ID/Name');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Date', 'date', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Equipment Details'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Date');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Start Hours', 'number', 'Hour meter at start', true, 1
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Usage Log'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Start Hours');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'End Hours', 'number', 'Hour meter at end', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Usage Log'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'End Hours');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order, options)
SELECT fs.id, 'Equipment Condition', 'select', true, 1, '[{"label":"Excellent","value":"excellent"},{"label":"Good","value":"good"},{"label":"Fair","value":"fair"},{"label":"Poor","value":"poor"}]'::jsonb
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Condition Report'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Equipment Condition');

INSERT INTO form_fields (section_id, label, field_type, placeholder, is_required, display_order)
SELECT fs.id, 'Operator Name', 'text', 'Full name', true, 2
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Condition Report'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Operator Name');

INSERT INTO form_fields (section_id, label, field_type, is_required, display_order)
SELECT fs.id, 'Operator Signature', 'signature', true, 3
FROM form_sections fs JOIN form_templates ft ON fs.template_id = ft.id
WHERE ft.name = 'Daily Equipment Log' AND fs.title = 'Condition Report'
AND NOT EXISTS (SELECT 1 FROM form_fields WHERE section_id = fs.id AND label = 'Operator Signature');