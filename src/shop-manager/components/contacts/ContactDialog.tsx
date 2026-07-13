import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact, ContactCategory } from '@/types/contacts';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  categories: ContactCategory[];
  onSave: (data: Partial<Contact>) => void;
}

export function ContactDialog({ open, onOpenChange, contact, categories, onSave }: ContactDialogProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      contact_type: contact?.contact_type || 'person',
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      company_name: contact?.company_name || '',
      job_title: contact?.job_title || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      mobile: contact?.mobile || '',
      website: contact?.website || '',
      address: contact?.address || '',
      city: contact?.city || '',
      state: contact?.state || '',
      zip: contact?.zip || '',
      notes: contact?.notes || '',
      category_id: contact?.category_id || '',
    }
  });

  React.useEffect(() => {
    if (contact) {
      reset({
        contact_type: contact.contact_type || 'person',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        company_name: contact.company_name || '',
        job_title: contact.job_title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        website: contact.website || '',
        address: contact.address || '',
        city: contact.city || '',
        state: contact.state || '',
        zip: contact.zip || '',
        notes: contact.notes || '',
        category_id: contact.category_id || '',
      });
    } else {
      reset({
        contact_type: 'person',
        first_name: '',
        last_name: '',
        company_name: '',
        job_title: '',
        email: '',
        phone: '',
        mobile: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        notes: '',
        category_id: '',
      });
    }
  }, [contact, reset]);

  const contactType = watch('contact_type');

  const onSubmit = (data: any) => {
    onSave({
      ...data,
      id: contact?.id,
      contact_type: data.contact_type as 'person' | 'company' | 'vendor' | 'supplier',
      category_id: data.category_id || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Contact Type</Label>
                <Select
                  value={contactType}
                  onValueChange={(value) => setValue('contact_type', value as 'person' | 'company' | 'vendor' | 'supplier')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Person</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contactType === 'person' && (
                <>
                  <div>
                    <Label>First Name</Label>
                    <Input {...register('first_name')} placeholder="John" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input {...register('last_name')} placeholder="Doe" />
                  </div>
                </>
              )}

              <div className={contactType === 'person' ? '' : 'col-span-2'}>
                <Label>Company Name</Label>
                <Input {...register('company_name')} placeholder="Acme Inc." />
              </div>

              {contactType === 'person' && (
                <div>
                  <Label>Job Title</Label>
                  <Input {...register('job_title')} placeholder="Sales Manager" />
                </div>
              )}

              <div className="col-span-2">
                <Label>Category</Label>
                <Select
                  value={watch('category_id') || ''}
                  onValueChange={(value) => setValue('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Email</Label>
                <Input {...register('email')} type="email" placeholder="john@example.com" />
              </div>

              <div>
                <Label>Phone</Label>
                <Input {...register('phone')} placeholder="(555) 123-4567" />
              </div>

              <div>
                <Label>Mobile</Label>
                <Input {...register('mobile')} placeholder="(555) 987-6543" />
              </div>

              <div>
                <Label>Website</Label>
                <Input {...register('website')} placeholder="https://example.com" />
              </div>

              <div className="col-span-2">
                <Label>Address</Label>
                <Input {...register('address')} placeholder="123 Main St" />
              </div>

              <div>
                <Label>City</Label>
                <Input {...register('city')} placeholder="New York" />
              </div>

              <div>
                <Label>State</Label>
                <Input {...register('state')} placeholder="NY" />
              </div>

              <div>
                <Label>ZIP Code</Label>
                <Input {...register('zip')} placeholder="10001" />
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea {...register('notes')} placeholder="Additional notes..." rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {contact ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
