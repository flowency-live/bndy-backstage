import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Star, StarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Act } from '@/types/api';

interface ActsManagerProps {
  artistId: string;
  actsEnabled: boolean;
  acts: Act[];
  onActsEnabledChange: (enabled: boolean) => void;
  onActsChange: (acts: Act[]) => void;
}

interface ActFormData {
  name: string;
  description: string;
  isDefault: boolean;
}

const API_BASE = 'https://api.bndy.co.uk';

export default function ActsManager({
  artistId,
  actsEnabled,
  acts,
  onActsEnabledChange,
  onActsChange,
}: ActsManagerProps) {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Act | null>(null);
  const [formData, setFormData] = useState<ActFormData>({ name: '', description: '', isDefault: false });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', description: '', isDefault: false });
    setEditingAct(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (act: Act) => {
    setEditingAct(act);
    setFormData({
      name: act.name,
      description: act.description || '',
      isDefault: act.isDefault || false,
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleCreateAct = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter an act name', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/artists/${artistId}/acts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create act');
      }

      const data = await response.json();
      onActsChange(data.acts);
      handleCloseModal();
      toast({ title: 'Act created', description: `"${formData.name}" added successfully` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAct = async () => {
    if (!editingAct || !formData.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter an act name', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/artists/${artistId}/acts/${editingAct.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update act');
      }

      const data = await response.json();
      onActsChange(data.acts);
      handleCloseModal();
      toast({ title: 'Act updated', description: `"${formData.name}" updated successfully` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAct = async (act: Act) => {
    if (!confirm(`Delete "${act.name}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/artists/${artistId}/acts/${act.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete act');
      }

      const data = await response.json();
      onActsChange(data.acts);
      toast({ title: 'Act deleted', description: `"${act.name}" removed` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (act: Act) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/artists/${artistId}/acts/${act.id}/default`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set default');
      }

      const data = await response.json();
      onActsChange(data.acts);
      toast({ title: 'Default updated', description: `"${act.name}" is now the default act` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Acts</span>
          <div className="flex items-center gap-2">
            <Label htmlFor="acts-enabled" className="text-sm font-normal text-muted-foreground">
              Enable acts
            </Label>
            <Switch
              id="acts-enabled"
              checked={actsEnabled}
              onCheckedChange={onActsEnabledChange}
            />
          </div>
        </CardTitle>
      </CardHeader>

      {actsEnabled && (
        <CardContent className="space-y-3">
          {acts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No acts defined. Add performance configurations like "Acoustic Duo" or "Full Band".
            </p>
          ) : (
            <div className="space-y-2">
              {acts.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{act.name}</span>
                    {act.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {act.description && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {act.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSetDefault(act)}
                      disabled={act.isDefault || loading}
                      title={act.isDefault ? 'Already default' : 'Set as default'}
                    >
                      {act.isDefault ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEditModal(act)}
                      disabled={loading}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAct(act)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleOpenAddModal}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Act
          </Button>
        </CardContent>
      )}

      {/* Add/Edit Act Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAct ? 'Edit Act' : 'Add Act'}</DialogTitle>
            <DialogDescription>
              {editingAct
                ? 'Update the act details'
                : 'Add a performance configuration (e.g., "Acoustic Duo", "Full Band")'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="act-name">Name *</Label>
              <Input
                id="act-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Acoustic Duo"
              />
            </div>

            <div>
              <Label htmlFor="act-description">Description</Label>
              <Textarea
                id="act-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of this act..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={editingAct ? handleUpdateAct : handleCreateAct}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Saving...' : editingAct ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
