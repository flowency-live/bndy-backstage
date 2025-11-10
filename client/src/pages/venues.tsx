import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";
import { MapPin, Plus, Phone, Mail, Building } from "lucide-react";
import type { ArtistMembership } from "@/types/api";
import { venueCRMService } from "@/lib/services/venue-crm-service";
import type { ArtistVenue } from "@/lib/services/venue-crm-service";
import AddVenueModal from "./components/AddVenueModal";

interface VenuesProps {
  artistId: string;
  membership: ArtistMembership;
}

export default function Venues({ artistId, membership }: VenuesProps) {
  const { session } = useServerAuth();
  const [, setLocation] = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch venues for this artist
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

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="px-2 sm:px-4 lg:px-6 pt-6 pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Venues</h1>
              <p className="text-muted-foreground">
                Manage your venue relationships and contacts
              </p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-venue"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          </div>

          {/* Add Venue Modal */}
          <AddVenueModal
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            artistId={artistId}
          />

          {/* Venues List */}
          {venues.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No venues yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start building your venue network by adding your first venue
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Venue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {venues.map((venue) => (
                <Card
                  key={venue.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200"
                  onClick={() => setLocation(`/venues/${venue.venue_id}`)}
                  data-testid={`venue-card-${venue.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <Building className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl mb-1">
                            {venue.custom_venue_name || venue.venue.name}
                          </CardTitle>
                          {venue.custom_venue_name && (
                            <p className="text-sm text-muted-foreground">
                              Official: {venue.venue.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <MapPin className="h-4 w-4" />
                            <span>{venue.venue.address}</span>
                            {venue.venue.city && <span>• {venue.venue.city}</span>}
                            {venue.venue.postcode && <span>• {venue.venue.postcode}</span>}
                          </div>
                          {venue.venue.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Phone className="h-4 w-4" />
                              <span>{venue.venue.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {venue.managed_on_bndy && (
                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                          On BNDY
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">{venue.contactCount}</span> contacts
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{venue.gigCount}</span> gigs
                      </div>
                      {venue.notes && (
                        <div className="flex-1 truncate">
                          <span className="italic">{venue.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
