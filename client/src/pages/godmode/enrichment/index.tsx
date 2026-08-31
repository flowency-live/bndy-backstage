import { Database, Network, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BacklineExplorer from './BacklineExplorer';
import BacklineGraph from './BacklineGraph';
import EntityEnrichmentDashboard from './EntityEnrichmentDashboard';

export default function EnrichmentDashboard() {
  return (
    <Tabs defaultValue="backline" className="space-y-4">
      <TabsList>
        <TabsTrigger value="backline" className="gap-2">
          <Database className="h-4 w-4" /> Backline Explorer
        </TabsTrigger>
        <TabsTrigger value="entity-enrichment" className="gap-2">
          <Sparkles className="h-4 w-4" /> Entity Enrichment
        </TabsTrigger>
        <TabsTrigger value="graph" className="gap-2">
          <Network className="h-4 w-4" /> Intelligence Graph
        </TabsTrigger>
      </TabsList>
      <TabsContent value="backline" className="mt-0">
        <BacklineExplorer />
      </TabsContent>
      <TabsContent value="entity-enrichment" className="mt-0">
        <EntityEnrichmentDashboard />
      </TabsContent>
      <TabsContent value="graph" className="mt-0">
        <BacklineGraph />
      </TabsContent>
    </Tabs>
  );
}
