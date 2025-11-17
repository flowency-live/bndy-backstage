import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";
import { ArrowLeft, Building, MapPin, Phone, Globe, Users, Calendar, Trash2, FileText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import type { ArtistMembership } from "@/types/api";
import { venueCRMService } from "@/lib/services/venue-crm-service";
import type { ArtistVenue } from "@/lib/services/venue-crm-service";
import ContactManager from "./components/ContactManager";
import GigHistory from "./components/GigHistory";
import VenueNotes from "./components/VenueNotes";

interface VenueDetailProps {
  artistId: string;
  venueId: string;
  membership: ArtistMembership;
}

type TabId = 'contacts' | 'gigs' | 'notes';

export default function VenueDetail({ artistId, venueId, membership }: VenueDetailProps) {
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('contacts');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch venue details
  const { data: venues = [], isLoading } = useQuery<ArtistVenue[]>({
    queryKey: ['artist-venues', artistId],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }
      return venueCRMService.getArtistVenues(artistId);
    },
    enabled: !!session && !!artistId,
  });

  const venue = venues.find(v => v.venue_id === venueId);

  // Delete venue mutation
  const deleteMutation = useMutation({
    mutationFn: () => venueCRMService.deleteArtistVenue(artistId, venueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-venues', artistId] });
      queryClient.invalidateQueries({ queryKey: ['venue-count', artistId] });

      toast({
        title: 'Venue removed',
        description: `${venue?.custom_venue_name || venue?.venue.name} has been removed from your CRM`,
      });

      setLocation('/venues');
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing venue',
        description: error.message || 'Failed to remove venue',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  const tabs = [
    { id: 'contacts' as TabId, label: 'Contacts', icon: Users },
    { id: 'gigs' as TabId, label: 'Our Gigs', icon: Calendar },
    { id: 'notes' as TabId, label: 'Notes', icon: FileText }
  ];

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Venue not found</h3>
            <p className="text-muted-foreground mb-6">
              This venue could not be found in your CRM
            </p>
            <Button onClick={() => setLocation('/venues')}>
              Back to Venues
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer variant="wide">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setLocation('/venues')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Venues
      </Button>

      {/* Venue Header */}
      <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
              <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                  <Building className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-foreground">
                      {venue.custom_venue_name || venue.venue.name}
                    </h1>
                    {venue.managed_on_bndy && (
                      <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium whitespace-nowrap">
                        On BNDY
                      </div>
                    )}
                  </div>
                  {venue.custom_venue_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Official name: {venue.venue.name}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {venue.venue.address}
                        {venue.venue.city && `, ${venue.venue.city}`}
                        {venue.venue.postcode && ` ${venue.venue.postcode}`}
                      </span>
                    </div>
                  </div>
                  {venue.venue.phone && (
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{venue.venue.phone}</span>
                    </div>
                  )}
                  {venue.venue.website && (
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <a
                        href={venue.venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:text-primary underline truncate"
                      >
                        {venue.venue.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Remove Venue"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-sm">
                <span className="font-semibold text-foreground">{venue.contactCount}</span>
                <span className="text-muted-foreground"> contacts</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">{venue.gigCount}</span>
                <span className="text-muted-foreground"> gigs</span>
              </div>
            </div>

            {/* Notes */}
            {venue.notes && (
              <Card className="mt-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground italic">{venue.notes}</p>
                </CardContent>
              </Card>
            )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-primary text-primary -mb-px'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {activeTab === 'contacts' && (
          <ContactManager artistId={artistId} venueId={venueId} />
        )}
        {activeTab === 'gigs' && (
          <GigHistory artistId={artistId} venueId={venueId} />
        )}
        {activeTab === 'notes' && (
          <VenueNotes artistId={artistId} venueId={venueId} />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Venue from CRM</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{venue?.custom_venue_name || venue?.venue.name}</strong> from your CRM?
              This will also delete all associated contacts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Venue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
