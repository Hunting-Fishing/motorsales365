import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, StarOff, Phone, Mail, Globe, MapPin, 
  MoreVertical, Pencil, Trash2, Building2, User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Contact } from '@/types/contacts';

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export function ContactCard({ contact, onEdit, onDelete, onToggleFavorite }: ContactCardProps) {
  const displayName = contact.contact_type === 'person' 
    ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'
    : contact.company_name || 'Unknown Company';
  
  const initials = contact.contact_type === 'person'
    ? `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : contact.company_name?.substring(0, 2).toUpperCase() || 'CO';

  const typeColors: Record<string, string> = {
    person: 'bg-blue-500/10 text-blue-500',
    company: 'bg-purple-500/10 text-purple-500',
    vendor: 'bg-green-500/10 text-green-500',
    supplier: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarImage src={contact.profile_image_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
                {contact.job_title && (
                  <p className="text-sm text-muted-foreground truncate">{contact.job_title}</p>
                )}
                {contact.contact_type === 'person' && contact.company_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {contact.company_name}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleFavorite(contact.id, !contact.is_favorite)}
                >
                  {contact.is_favorite ? (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(contact)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(contact.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="mt-3 space-y-1.5">
              {contact.email && (
                <a 
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a 
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.website && (
                <a 
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="truncate">{contact.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {(contact.city || contact.state) && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{[contact.city, contact.state].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
            
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className={typeColors[contact.contact_type]}>
                {contact.contact_type === 'person' ? <User className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                {contact.contact_type}
              </Badge>
              {contact.category && (
                <Badge 
                  variant="outline" 
                  style={{ borderColor: contact.category.color, color: contact.category.color }}
                >
                  {contact.category.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
