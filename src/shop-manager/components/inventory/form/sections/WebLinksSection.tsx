import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WebLink {
  id: string;
  type: string;
  label: string;
  url: string;
}

interface WebLinksSectionProps {
  values: any;
  onChange: (field: string, value: any) => void;
}

const LINK_TYPES = [
  { value: 'manufacturer_website', label: 'Manufacturer Website', icon: '🏭' },
  { value: 'product_page', label: 'Product Page', icon: '📄' },
  { value: 'installation_video', label: 'Installation Video', icon: '🎥' },
  { value: 'youtube_tutorial', label: 'YouTube Tutorial', icon: '▶️' },
  { value: 'product_manual', label: 'Product Manual', icon: '📖' },
  { value: 'datasheet', label: 'Technical Datasheet', icon: '📊' },
  { value: 'onedrive', label: 'OneDrive Document', icon: '☁️' },
  { value: 'google_drive', label: 'Google Drive', icon: '💾' },
  { value: 'dropbox', label: 'Dropbox', icon: '📦' },
  { value: 'warranty_info', label: 'Warranty Information', icon: '🛡️' },
  { value: 'safety_sheet', label: 'Safety Data Sheet', icon: '⚠️' },
  { value: 'supplier_portal', label: 'Supplier Portal', icon: '🔗' },
  { value: 'parts_diagram', label: 'Parts Diagram', icon: '🔧' },
  { value: 'compatibility_chart', label: 'Compatibility Chart', icon: '📋' },
  { value: 'price_list', label: 'Price List', icon: '💰' },
  { value: 'other', label: 'Other', icon: '🔗' }
];

export function WebLinksSection({ values, onChange }: WebLinksSectionProps) {
  const [newLink, setNewLink] = useState<Partial<WebLink>>({
    type: '',
    label: '',
    url: ''
  });

  const webLinks: WebLink[] = values.webLinks || [];

  const handleAddLink = () => {
    if (newLink.type && newLink.url) {
      const linkToAdd: WebLink = {
        id: `link_${Date.now()}`,
        type: newLink.type,
        label: newLink.label || LINK_TYPES.find(t => t.value === newLink.type)?.label || '',
        url: newLink.url
      };

      onChange('webLinks', [...webLinks, linkToAdd]);
      
      // Reset form
      setNewLink({
        type: '',
        label: '',
        url: ''
      });
    }
  };

  const handleRemoveLink = (id: string) => {
    onChange('webLinks', webLinks.filter(link => link.id !== id));
  };

  const handleTypeChange = (type: string) => {
    const selectedType = LINK_TYPES.find(t => t.value === type);
    setNewLink({
      ...newLink,
      type,
      label: selectedType?.label || ''
    });
  };

  const getLinkIcon = (type: string) => {
    return LINK_TYPES.find(t => t.value === type)?.icon || '🔗';
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Web Links & Resources
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add links to manufacturer websites, product manuals, videos, cloud documents, and other resources
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Link Form */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
          <h4 className="font-medium text-sm">Add New Link</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="link-type">Link Type *</Label>
              <Select value={newLink.type} onValueChange={handleTypeChange}>
                <SelectTrigger id="link-type" className="bg-background">
                  <SelectValue placeholder="Select link type" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px] overflow-y-auto z-50">
                  {LINK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-label">Custom Label (Optional)</Label>
              <Input
                id="link-label"
                value={newLink.label || ''}
                onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                placeholder="e.g., 2024 Product Catalog"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="link-url"
                  type="url"
                  value={newLink.url || ''}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  placeholder="https://example.com"
                  className="bg-background"
                />
                <Button
                  type="button"
                  onClick={handleAddLink}
                  disabled={!newLink.type || !newLink.url}
                  size="icon"
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Links Table */}
        {webLinks.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <span className="text-2xl" title={LINK_TYPES.find(t => t.value === link.type)?.label}>
                        {getLinkIcon(link.type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {link.label}
                    </TableCell>
                    <TableCell>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 max-w-[300px] truncate"
                      >
                        {link.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLink(link.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
            <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No links added yet</p>
            <p className="text-xs">Add links to manufacturer resources, manuals, videos, and more</p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h5 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">💡 Quick Tips</h5>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Link to manufacturer websites for product specifications</li>
            <li>• Add YouTube videos for installation tutorials</li>
            <li>• Store manuals and datasheets in OneDrive/Google Drive for easy access</li>
            <li>• Include warranty information and safety data sheets</li>
            <li>• Add compatibility charts and parts diagrams for reference</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
