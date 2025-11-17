import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Phone, Mail, User, Edit2, Trash2, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { venueCRMService } from '@/lib/services/venue-crm-service';
import type { VenueContact } from '@/lib/services/venue-crm-service';

interface ContactManagerProps {
  artistId: string;
  venueId: string;
}

type ContactFormData = {
  name: string;
  mobile: string;
  landline: string;
  email: string;
};

const emptyForm: ContactFormData = {
  name: '',
  mobile: '',
  landline: '',
  email: '',
};

export default function ContactManager({ artistId, venueId }: ContactManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<VenueContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery<VenueContact[]>({
    queryKey: ['venue-contacts', artistId, venueId],
    queryFn: () => venueCRMService.getVenueContacts(artistId, venueId),
  });

  // Create contact mutation
  const createMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      venueCRMService.createVenueContact(artistId, venueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-contacts', artistId, venueId] });
      queryClient.invalidateQueries({ queryKey: ['artist-venues', artistId] });
      toast({ title: 'Contact added', description: 'Contact has been added successfully' });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding contact',
        description: error.message || 'Failed to add contact',
        variant: 'destructive',
      });
    },
  });

  // Update contact mutation
  const updateMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      venueCRMService.updateVenueContact(artistId, venueId, editingContact!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-contacts', artistId, venueId] });
      queryClient.invalidateQueries({ queryKey: ['artist-venues', artistId] });
      toast({ title: 'Contact updated', description: 'Contact has been updated successfully' });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating contact',
        description: error.message || 'Failed to update contact',
        variant: 'destructive',
      });
    },
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: (contactId: string) =>
      venueCRMService.deleteVenueContact(artistId, venueId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-contacts', artistId, venueId] });
      queryClient.invalidateQueries({ queryKey: ['artist-venues', artistId] });
      toast({ title: 'Contact deleted', description: 'Contact has been removed' });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting contact',
        description: error.message || 'Failed to delete contact',
        variant: 'destructive',
      });
    },
  });

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormData(emptyForm);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (contact: VenueContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      mobile: contact.mobile || '',
      landline: contact.landline || '',
      email: contact.email || '',
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingContact(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a contact name',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.mobile && !formData.landline && !formData.email) {
      toast({
        title: 'Contact info required',
        description: 'Please provide at least one contact method (mobile, landline, or email)',
        variant: 'destructive',
      });
      return;
    }

    if (editingContact) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (contactId: string) => {
    setDeleteConfirm(contactId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Contacts</h2>
        <Button onClick={handleOpenAddModal} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <UserCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first contact to start building your venue relationship
            </p>
            <Button onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{contact.name}</h4>
                      <div className="space-y-1 mt-2">
                        {contact.mobile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="break-all">{contact.mobile}</span>
                          </div>
                        )}
                        {contact.landline && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="break-all">{contact.landline} (landline)</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <a href={`mailto:${contact.email}`} className="hover:text-primary underline truncate">
                              {contact.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(contact)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? 'Update the contact information'
                : 'Add a new contact for this venue'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contact name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="07xxx xxxxxx"
                />
              </div>

              <div>
                <Label htmlFor="landline">Landline</Label>
                <Input
                  id="landline"
                  type="tel"
                  value={formData.landline}
                  onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
                  placeholder="01xxx xxxxxx"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                * At least one contact method (mobile, landline, or email) is required
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    {editingContact ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>{editingContact ? 'Update Contact' : 'Add Contact'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete Contact'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
