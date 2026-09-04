import { Activity, Database, Network, RefreshCw, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BacklineExplorer from './BacklineExplorer';
import BacklineOperations from './BacklineOperations';
import BacklineGraph from './BacklineGraph';
import BacklineCorpus from './BacklineCorpus';
import EntityEnrichmentDashboard from './EntityEnrichmentDashboard';

export default function EnrichmentDashboard() {
  return (
    <Tabs defaultValue="operations" className="space-y-4">
      <TabsList>
        <TabsTrigger value="operations" className="gap-2">
          <Activity className="h-4 w-4" /> Operations
        </TabsTrigger>
        <TabsTrigger value="backline" className="gap-2">
          <Database className="h-4 w-4" /> Backline Explorer
        </TabsTrigger>
        <TabsTrigger value="entity-enrichment" className="gap-2">
          <Sparkles className="h-4 w-4" /> Entity Enrichment
        </TabsTrigger>
        <TabsTrigger value="corpus" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Canonical Corpus
        </TabsTrigger>
        <TabsTrigger value="graph" className="gap-2">
          <Network className="h-4 w-4" /> Intelligence Graph
        </TabsTrigger>
      </TabsList>
      <TabsContent value="operations" className="mt-0">
        <BacklineOperations />
      </TabsContent>
      <TabsContent value="backline" className="mt-0">
        <BacklineExplorer />
      </TabsContent>
      <TabsContent value="entity-enrichment" className="mt-0">
        <EntityEnrichmentDashboard />
      </TabsContent>
      <TabsContent value="corpus" className="mt-0">
        <BacklineCorpus />
      </TabsContent>
      <TabsContent value="graph" className="mt-0">
        <BacklineGraph />
      </TabsContent>
    </Tabs>
  );
}
