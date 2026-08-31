import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Network, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  backlineService,
  type BacklineGraphNode,
  type BacklineGraphNodeKind,
} from '@/lib/services/backline-service';
import { positionNeighborhood } from './graph-layout';

const nodeColour: Record<BacklineGraphNodeKind, string> = {
  source: '#2563eb',
  observation: '#0891b2',
  claim: '#7c3aed',
  candidate: '#d97706',
  entity: '#059669',
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function NodeDetails({ node }: { node?: BacklineGraphNode }) {
  if (!node) return <div className="text-sm text-muted-foreground">Select a node to inspect its evidence and relationships.</div>;
  const entries = Object.entries(node.data ?? {}).filter(([key]) => !['pk', 'sk', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK'].includes(key));
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white" style={{ backgroundColor: nodeColour[node.kind] }}>{node.kind}</span>
        <span className="break-all font-medium">{node.label}</span>
      </div>
      <div className="mt-1 break-all text-[11px] text-muted-foreground">{node.ref}</div>
      <div className="mt-4 max-h-[410px] space-y-2 overflow-auto pr-1">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded border bg-background/70 p-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{key}</div>
            <div className="mt-1 break-words text-xs">{displayValue(value)}</div>
          </div>
        ))}
        {!entries.length && <div className="text-xs text-muted-foreground">Expand this node to load its stored detail.</div>}
      </div>
    </div>
  );
}

export default function BacklineGraph() {
  const [family, setFamily] = useState('klma');
  const [nodeRef, setNodeRef] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const summary = useQuery({
    queryKey: ['backline', 'graph-sources', family],
    queryFn: () => backlineService.summary(family),
    refetchInterval: 60000,
  });
  const graph = useQuery({
    queryKey: ['backline', 'graph', nodeRef],
    queryFn: () => backlineService.graph(nodeRef!, 60),
    enabled: Boolean(nodeRef),
  });

  const positioned = useMemo(
    () => positionNeighborhood(graph.data?.nodes ?? [], graph.data?.center ?? ''),
    [graph.data],
  );
  const positions = useMemo(() => new Map(positioned.map((node) => [node.ref, node])), [positioned]);
  const currentNode = graph.data?.nodes.find((node) => node.ref === graph.data?.center);

  const openNode = (next: string) => {
    if (nodeRef && next !== nodeRef) setHistory((items) => [...items, nodeRef].slice(-20));
    setNodeRef(next);
  };
  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setNodeRef(previous);
  };
  const chooseFamily = (next: string) => {
    setFamily(next);
    setNodeRef(null);
    setHistory([]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold"><Network className="h-4 w-4" /> Backline intelligence graph</div>
            <p className="mt-1 text-sm text-muted-foreground">Walk from a source snapshot through Observations and atomic Claims to candidate identities and canonical BNDY entities. This view is read-only.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={goBack} disabled={!history.length}><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back</Button>
            <Button size="sm" variant="outline" onClick={() => graph.refetch()} disabled={!nodeRef}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(summary.data?.families ?? []).map((item) => (
            <button key={item.id} onClick={() => chooseFamily(item.id)} className={`rounded-full border px-3 py-1 text-xs ${family === item.id ? 'border-foreground/40 bg-foreground text-background' : 'hover:bg-muted'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(summary.data?.sources ?? []).map((source) => (
            <button key={source.id} onClick={() => openNode(`source:${source.id}`)} className={`rounded border px-3 py-2 text-left text-xs hover:bg-muted ${nodeRef === `source:${source.id}` ? 'border-blue-500 bg-blue-500/5' : ''}`}>
              <div className="font-medium">{source.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{source.enabled ? 'enabled' : 'inactive'} · {source.shadow ? 'shadow' : 'write-capable'}</div>
            </button>
          ))}
          {!summary.isLoading && !(summary.data?.sources.length) && (
            <div className="text-xs text-muted-foreground">No configured {summary.data?.family?.label ?? family} source exists yet. Its onboarding remains visible here rather than being mistaken for live coverage.</div>
          )}
        </div>
      </div>

      {graph.isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Graph query failed</div>
          <div className="mt-1 text-muted-foreground">The graph API must be released before live Backline relationships can be explored.</div>
        </div>
      )}

      {!nodeRef && (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">Choose a configured source to enter the evidence graph.</div>
      )}

      {nodeRef && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative min-h-[620px] overflow-hidden rounded-lg border bg-slate-950">
            {graph.isLoading && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Loading the neighbourhood…</div>}
            {graph.data && (
              <svg viewBox="0 0 1000 620" className="h-full min-h-[620px] w-full" role="img" aria-label="Backline evidence graph">
                <defs>
                  <marker id="backline-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b" /></marker>
                </defs>
                {graph.data.edges.map((edge) => {
                  const from = positions.get(edge.from);
                  const to = positions.get(edge.to);
                  if (!from || !to) return null;
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2;
                  return (
                    <g key={`${edge.from}:${edge.kind}:${edge.to}`}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#64748b" strokeWidth="1.5" markerEnd="url(#backline-arrow)" />
                      <text x={mx} y={my - 5} fill="#94a3b8" fontSize="10" textAnchor="middle">{edge.kind}</text>
                    </g>
                  );
                })}
                {positioned.map((node) => {
                  const selected = node.ref === graph.data.center;
                  return (
                    <g key={node.ref} onClick={() => openNode(node.ref)} className="cursor-pointer" role="button" tabIndex={0}>
                      <circle cx={node.x} cy={node.y} r={selected ? 38 : 30} fill={nodeColour[node.kind]} stroke={selected ? '#f8fafc' : '#0f172a'} strokeWidth={selected ? 4 : 2} />
                      <text x={node.x} y={node.y + 3} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">{node.kind.slice(0, 5).toUpperCase()}</text>
                      <text x={node.x} y={node.y + (selected ? 56 : 48)} fill="#e2e8f0" fontSize="11" textAnchor="middle">{node.label.slice(0, 38)}</text>
                    </g>
                  );
                })}
              </svg>
            )}
            {graph.data?.truncated && <div className="absolute bottom-3 left-3 rounded bg-amber-400/15 px-2 py-1 text-xs text-amber-200">Bounded view. Select a node to continue.</div>}
          </div>
          <div className="rounded-lg border bg-card p-4"><NodeDetails node={currentNode} /></div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {(Object.keys(nodeColour) as BacklineGraphNodeKind[]).map((kind) => <span key={kind} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: nodeColour[kind] }} />{kind}</span>)}
      </div>
    </div>
  );
}

