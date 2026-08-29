import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Building2, ExternalLink, Loader2, MessageSquareText, Music2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { GodmodePageHeader } from '../components/godmode-ui';

type ClaimStatus = 'pending' | 'pending_review' | 'verified_pending' | 'more_evidence_required' | 'conflict' | 'approved' | 'rejected' | 'cancelled';
type Evidence = {
  type?: string;
  method?: string;
  status?: string;
  strength?: string;
  explanation?: string;
  supporting_url?: string | null;
  official_email?: string | null;
  public_reference?: string | null;
  metadata?: { explanation?: string; official_email?: string | null };
  page_id?: string;
  page_name?: string;
  page_url?: string;
  verified_at?: string;
  reconciliation?: string;
  observed_at?: string;
};
type JoinClaim = {
  claim_id: string;
  entity_type: 'artist' | 'venue';
  entity_id: string;
  entity_name: string;
  user_id: string;
  requested_role: 'owner' | 'admin' | 'member';
  relationship_kind?: string | null;
  verification_method?: 'manual' | 'facebook_page';
  status: ClaimStatus;
  evidence?: Evidence[];
  evidence_hints?: Record<string, string>;
  evidence_revision?: number;
  owner_at_claim_time?: string | null;
  current_owner_user_id?: string | null;
  competing_claim_count?: number;
  created_at: string;
};

type ReviewStatus = 'approved' | 'rejected' | 'more_evidence_required';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

const statusLabel: Record<string, string> = {
  pending: 'Legacy pending',
  pending_review: 'Needs human review',
  verified_pending: 'Machine verified · safety review',
  more_evidence_required: 'More evidence needed',
  conflict: 'Authority conflict',
};
const relationLabel = (value?: string | null) => value ? value.replaceAll('_', ' ') : 'relationship not specified';
const evidenceMethod = (item: Evidence) => item.method || item.type || 'evidence';
const evidenceExplanation = (item: Evidence) => item.metadata?.explanation || item.explanation;
const evidenceEmail = (item: Evidence) => item.metadata?.official_email || item.official_email;
const evidenceUrl = (item: Evidence) => item.public_reference || item.supporting_url || item.page_url;

export default function ClaimsPage() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<JoinClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const result = await api<{ claims: JoinClaim[] }>('/api/admin/claims');
      setClaims(result.claims || []);
    } catch (error) {
      toast({ title: 'Could not load claims', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => ({
    total: claims.length,
    verified: claims.filter((claim) => claim.status === 'verified_pending').length,
    conflicts: claims.filter((claim) => claim.status === 'conflict' || (claim.competing_claim_count || 0) > 1).length,
  }), [claims]);

  const review = async (claim: JoinClaim, status: ReviewStatus) => {
    const note = (notes[claim.claim_id] || '').trim();
    if (status === 'more_evidence_required' && !note) {
      toast({ title: 'Add a review note', description: 'Tell the claimant exactly what additional evidence you need.', variant: 'destructive' });
      return;
    }
    setWorkingId(claim.claim_id);
    try {
      await api(`/api/admin/claims/${claim.claim_id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
      if (status === 'more_evidence_required') {
        setClaims((current) => current.map((item) => item.claim_id === claim.claim_id ? { ...item, status } : item));
        toast({ title: 'More evidence requested', description: claim.entity_name });
      } else {
        setClaims((current) => current.filter((item) => item.claim_id !== claim.claim_id));
        toast({ title: status === 'approved' ? 'Claim approved' : 'Claim rejected', description: claim.entity_name });
      }
    } catch (error) {
      toast({ title: 'Review failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setWorkingId(null);
    }
  };

  return <div className="space-y-5">
    <GodmodePageHeader icon={ShieldCheck} title="Authority claims" description="Evidence-led Artist and Venue access. Login proves the person; this queue decides whether the evidence proves their relationship to the entity." />
    <div className="grid gap-3 sm:grid-cols-3"><Metric value={counts.total} label="Reviewable claims" /><Metric value={counts.verified} label="Machine verified" /><Metric value={counts.conflicts} label="Conflicts / competing" /></div>
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Evidence decides, not login provider.</div><Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
    {loading ? <div className="grid min-h-56 place-items-center rounded-2xl border bg-card"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : claims.length === 0 ? <div className="grid min-h-56 place-items-center rounded-2xl border bg-card p-8 text-center"><div><BadgeCheck className="mx-auto h-8 w-8 text-emerald-500" /><div className="mt-3 font-black">No claims waiting</div><p className="mt-1 text-sm text-muted-foreground">The authority queue is clear.</p></div></div> : <div className="space-y-3">{claims.map((claim) => <ClaimCard key={claim.claim_id} claim={claim} working={workingId === claim.claim_id} note={notes[claim.claim_id] || ''} onNote={(value) => setNotes((current) => ({ ...current, [claim.claim_id]: value }))} onReview={(status) => void review(claim, status)} />)}</div>}
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black tabular-nums">{value}</div><div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div></div>;
}

function ClaimCard({ claim, working, note, onNote, onReview }: { claim: JoinClaim; working: boolean; note: string; onNote: (value: string) => void; onReview: (status: ReviewStatus) => void }) {
  const Icon = claim.entity_type === 'artist' ? Music2 : Building2;
  const hints = Object.entries(claim.evidence_hints || {}).filter(([, value]) => Boolean(value));
  const evidence = claim.evidence || [];
  const competing = claim.competing_claim_count || 1;
  const currentOwner = claim.current_owner_user_id || claim.owner_at_claim_time;

  return <article className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"><div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
    <div className="min-w-0">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-black">{claim.entity_name || claim.entity_id}</h2><span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-500">{claim.requested_role}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">{statusLabel[claim.status] || claim.status}</span></div><div className="mt-1 text-xs text-muted-foreground">{claim.entity_type} · {relationLabel(claim.relationship_kind)} · {new Date(claim.created_at).toLocaleString('en-GB')}</div><div className="mt-1 break-all text-[10px] text-muted-foreground/70">user {claim.user_id}</div></div></div>

      {(claim.status === 'conflict' || competing > 1 || (claim.requested_role === 'owner' && currentOwner && currentOwner !== claim.user_id)) && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><div className="flex items-center gap-2 font-black text-amber-600"><AlertTriangle className="h-4 w-4" />Authority conflict</div><div className="mt-1 text-muted-foreground">{currentOwner ? <>Current owner: <span className="break-all font-semibold">{currentOwner}</span>. </> : null}{competing > 1 ? `${competing} reviewable claims currently reference this entity.` : 'This ownership request conflicts with the established authority state.'}</div></div>}

      <div className="mt-4 space-y-2">{evidence.length === 0 ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">Legacy evidence-free claim. Do not approve without an external check.</div> : evidence.map((item, index) => {
        const method = evidenceMethod(item);
        const explanation = evidenceExplanation(item);
        const email = evidenceEmail(item);
        const url = evidenceUrl(item);
        return <div key={item.observed_at || index} className="rounded-xl border bg-muted/30 p-3"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{method === 'facebook_page_control' ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> : <MessageSquareText className="h-3.5 w-3.5" />}{method.replaceAll('_', ' ')}{item.strength && <span className="rounded-full border px-1.5 py-0.5">{item.strength}</span>}{item.status && <span className="rounded-full border px-1.5 py-0.5">{item.status}</span>}</div>{explanation && <p className="mt-2 whitespace-pre-wrap text-sm font-semibold">{explanation}</p>}{email && <div className="mt-2 text-xs"><b>Official email:</b> {email}</div>}{url && <a className="mt-2 flex items-center gap-1 break-all text-xs font-semibold text-primary" href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />{url}</a>}{item.page_id && <div className="mt-2 text-xs"><b>Facebook Page:</b> {item.page_name || item.page_id} · {item.reconciliation || 'unresolved'}</div>}</div>;
      })}</div>

      {claim.evidence_revision && claim.evidence_revision > 1 && <div className="mt-2 text-[10px] font-semibold text-muted-foreground">Evidence revision {claim.evidence_revision}</div>}
      {hints.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{hints.map(([key, value]) => <div key={key} className="rounded-xl bg-muted/50 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</div><div className="mt-0.5 break-words text-xs font-semibold">{value}</div></div>)}</div>}
    </div>

    <div><label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Review note</label><textarea value={note} onChange={(event) => onNote(event.target.value)} placeholder="What did you verify, or what else is needed?" className="mt-1.5 min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" /><Button variant="outline" disabled={working || !note.trim()} className="mt-2 w-full gap-1.5 rounded-xl" onClick={() => onReview('more_evidence_required')}><MessageSquareText className="h-4 w-4" />Request more evidence</Button><div className="mt-2 grid grid-cols-2 gap-2"><Button variant="outline" disabled={working} className="gap-1.5 rounded-xl text-destructive hover:text-destructive" onClick={() => onReview('rejected')}><XCircle className="h-4 w-4" />Reject</Button><Button disabled={working || claim.status === 'conflict'} className="gap-1.5 rounded-xl" onClick={() => onReview('approved')}>{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}Approve</Button></div>{claim.status === 'conflict' && <p className="mt-2 text-[10px] font-semibold text-amber-600">Resolve ownership conflict before approval.</p>}</div>
  </div></article>;
}
