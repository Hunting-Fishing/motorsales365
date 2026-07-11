-- Insert sample email templates
INSERT INTO public.email_templates (id, name, subject, description, content, category)
VALUES 
  (gen_random_uuid(), 'Appointment Reminder', 'Reminder: Your appointment is coming up', 'Sent to remind customers of upcoming appointments', 'Hello {{customer_name}}, This is a friendly reminder that you have an appointment scheduled.', 'appointment'),
  (gen_random_uuid(), 'Work Order Update', 'Update on your vehicle service', 'Sent when work order status changes', 'Hello {{customer_name}}, We wanted to update you on the status of your service.', 'work_order'),
  (gen_random_uuid(), 'Invoice Ready', 'Your invoice is ready', 'Sent when invoice is ready for payment', 'Hello {{customer_name}}, Your invoice for recent services is now ready.', 'invoice')
ON CONFLICT DO NOTHING;

-- Insert sample SMS templates  
INSERT INTO public.sms_templates (id, name, content, category)
VALUES 
  (gen_random_uuid(), 'Appointment Reminder', 'Reminder: Your appointment is on {{date}} at {{time}}. Reply C to confirm or R to reschedule.', 'appointment'),
  (gen_random_uuid(), 'Service Complete', 'Great news! Your vehicle service is complete and ready for pickup. Thank you!', 'work_order'),
  (gen_random_uuid(), 'Payment Reminder', 'Friendly reminder: Invoice #{{invoice_number}} for ${{amount}} is due on {{due_date}}.', 'payment')
ON CONFLICT DO NOTHING;