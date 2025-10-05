import { useState } from 'react';
import { MapPin, Music, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GodmodePage() {
  const [activeTab, setActiveTab] = useState('venues');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Godmode Admin</h1>
        <p className="text-muted-foreground">Manage venues, artists, and songs across the platform</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Venues
          </TabsTrigger>
          <TabsTrigger value="artists" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Artists
          </TabsTrigger>
          <TabsTrigger value="songs" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Songs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Venues Management</CardTitle>
              <CardDescription>View and manage all venues in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Venues grid coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artists" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Artists Management</CardTitle>
              <CardDescription>View and manage all artists in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Artists grid coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="songs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Songs Management</CardTitle>
              <CardDescription>View and manage all songs in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Songs grid coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
