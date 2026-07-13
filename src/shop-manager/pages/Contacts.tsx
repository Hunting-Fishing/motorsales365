import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Search, Users, Globe, Star, Filter,
  Truck, Package, Wrench, FileText
} from 'lucide-react';
import { ContactCard } from '@/components/contacts/ContactCard';
import { ResourceCard } from '@/components/contacts/ResourceCard';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { ResourceDialog } from '@/components/contacts/ResourceDialog';
import { 
  useContacts, 
  useResources, 
  useContactCategories,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useToggleContactFavorite,
  useToggleResourceFavorite,
} from '@/hooks/useContacts';
import { Contact, Resource } from '@/types/contacts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  package: Package,
  wrench: Wrench,
  users: Users,
  globe: Globe,
  'file-text': FileText,
};

export default function Contacts() {
  const [activeTab, setActiveTab] = useState('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Dialogs
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);

  // Data hooks
  const { data: categories = [] } = useContactCategories();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts(selectedCategory);
  const { data: resources = [], isLoading: resourcesLoading } = useResources(selectedCategory);

  // Mutation hooks
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();
  const toggleContactFavorite = useToggleContactFavorite();
  const toggleResourceFavorite = useToggleResourceFavorite();

  // Filter data
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = searchQuery === '' || 
      `${c.first_name} ${c.last_name} ${c.company_name} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !showFavoritesOnly || c.is_favorite;
    return matchesSearch && matchesFavorite;
  });

  const filteredResources = resources.filter(r => {
    const matchesSearch = searchQuery === '' || 
      `${r.name} ${r.description} ${r.url}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !showFavoritesOnly || r.is_favorite;
    return matchesSearch && matchesFavorite;
  });

  // Handlers
  const handleSaveContact = (data: Partial<Contact>) => {
    if (data.id) {
      updateContact.mutate(data as Contact & { id: string });
    } else {
      createContact.mutate(data);
    }
    setEditingContact(null);
  };

  const handleSaveResource = (data: Partial<Resource>) => {
    if (data.id) {
      updateResource.mutate(data as Resource & { id: string });
    } else {
      createResource.mutate(data);
    }
    setEditingResource(null);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setResourceDialogOpen(true);
  };

  const handleConfirmDeleteContact = () => {
    if (deleteContactId) {
      deleteContact.mutate(deleteContactId);
      setDeleteContactId(null);
    }
  };

  const handleConfirmDeleteResource = () => {
    if (deleteResourceId) {
      deleteResource.mutate(deleteResourceId);
      setDeleteResourceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contacts & Resources</h1>
              <p className="text-muted-foreground text-sm">Manage your business contacts and online resources</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className={`h-4 w-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorites
              </Button>
              
              <Button 
                onClick={() => {
                  if (activeTab === 'contacts') {
                    setEditingContact(null);
                    setContactDialogOpen(true);
                  } else {
                    setEditingResource(null);
                    setResourceDialogOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add {activeTab === 'contacts' ? 'Contact' : 'Resource'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Categories
              </h3>
              
              <div className="space-y-1">
                <Button
                  variant={selectedCategory === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </Button>
                
                {categories.map((cat) => {
                  const IconComponent = categoryIcons[cat.icon] || Users;
                  return (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-2"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <IconComponent className="h-4 w-4" style={{ color: cat.color }} />
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <TabsList className="grid w-full sm:w-auto grid-cols-2">
                  <TabsTrigger value="contacts" className="gap-2">
                    <Users className="h-4 w-4" />
                    Contacts
                    <Badge variant="secondary" className="ml-1">{filteredContacts.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Resources
                    <Badge variant="secondary" className="ml-1">{filteredResources.length}</Badge>
                  </TabsTrigger>
                </TabsList>
                
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <TabsContent value="contacts" className="mt-0">
                {contactsLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No contacts found</h3>
                    <p className="text-muted-foreground mb-4">Add your first contact to get started</p>
                    <Button onClick={() => { setEditingContact(null); setContactDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onEdit={handleEditContact}
                        onDelete={(id) => setDeleteContactId(id)}
                        onToggleFavorite={(id, fav) => toggleContactFavorite.mutate({ id, is_favorite: fav })}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resources" className="mt-0">
                {resourcesLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading resources...</div>
                ) : filteredResources.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
                    <p className="text-muted-foreground mb-4">Add your first resource to get started</p>
                    <Button onClick={() => { setEditingResource(null); setResourceDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        onEdit={handleEditResource}
                        onDelete={(id) => setDeleteResourceId(id)}
                        onToggleFavorite={(id, fav) => toggleResourceFavorite.mutate({ id, is_favorite: fav })}
                        onAccess={() => {}}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={editingContact}
        categories={categories}
        onSave={handleSaveContact}
      />

      <ResourceDialog
        open={resourceDialogOpen}
        onOpenChange={setResourceDialogOpen}
        resource={editingResource}
        categories={categories}
        onSave={handleSaveResource}
      />

      {/* Delete Confirmations */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteContact} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteResourceId} onOpenChange={() => setDeleteResourceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteResource} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
