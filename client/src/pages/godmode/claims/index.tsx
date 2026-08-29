import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Building2, ExternalLink, Loader2, MessageSquareText, Music2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { GodmodePageHeader } from '../components/godmode-ui';

type ClaimStatus = 'pending' | 'pending_review' | 'verified_pending' | 'more_evidence_required' | 'conflict' | 'approved' | 'rejected' | 'cancelled';
type Evidence = { type?: string; explanation?: string; supporting_url?: string | null; official_email?: string | null; page_id?: string; page_name?: string; page_url?: string; verified_at?: string; reconciliation?: string };
type JoinClaim = {
  claim_id: string; entity_type: 'artist' | 'venue'; entity_id: string; entity_name: string; user_id: string;
  requested_role: 'owner' | 'admin' | 'member'; relationship_kind?: string | null; verification_method?: 'manual' | 'facebook_page';
  status: ClaimStatus; evidence?: Evidence[]; evidence_hints?: Record<string, string>; created_at: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

const statusLabel: Record<string,string> = { pending: 'Legacy pending', pending_review: 'Needs human review', verified_pending: 'Machine verified · safety review', more_evidence_required: 'More evidence needed', conflict: 'Authority conflict' };
const relationLabel=(value?:string|null)=>value ? value.replaceAll('_',' ') : 'relationship not specified';

export default function ClaimsPage() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<JoinClaim[]>([]); const [loading, setLoading] = useState(true); const [workingId, setWorkingId] = useState<string | null>(null); const [notes, setNotes] = useState<Record<string,string>>({});
  const load=async()=>{setLoading(true);try{const result=await api<{claims:JoinClaim[]}>('/api/admin/claims');setClaims(result.claims||[]);}catch(error){toast({title:'Could not load claims',description:error instanceof Error?error.message:'Unknown error',variant:'destructive'});}finally{setLoading(false)}};
  useEffect(()=>{void load();},[]);
  const counts=useMemo(()=>({total:claims.length,verified:claims.filter(c=>c.status==='verified_pending').length,manual:claims.filter(c=>c.verification_method!=='facebook_page').length}),[claims]);
  const review=async(claim:JoinClaim,status:'approved'|'rejected')=>{setWorkingId(claim.claim_id);try{await api(`/api/admin/claims/${claim.claim_id}`,{method:'PATCH',body:JSON.stringify({status,note:notes[claim.claim_id]||''})});setClaims(current=>current.filter(item=>item.claim_id!==claim.claim_id));toast({title:status==='approved'?'Claim approved':'Claim rejected',description:claim.entity_name});}catch(error){toast({title:'Review failed',description:error instanceof Error?error.message:'Unknown error',variant:'destructive'});}finally{setWorkingId(null)}};
  return <div className="space-y-5">
    <GodmodePageHeader icon={ShieldCheck} title="Authority claims" description="Evidence-led Artist and Venue access. Login proves the person; this queue decides whether the evidence proves their relationship to the entity." />
    <div className="grid gap-3 sm:grid-cols-3"><Metric value={counts.total} label="Reviewable claims"/><Metric value={counts.verified} label="Machine verified"/><Metric value={counts.manual} label="Manual evidence"/></div>
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-4 w-4"/> Evidence decides, not login provider.</div><Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled={loading} onClick={()=>void load()}><RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`}/>Refresh</Button></div>
    {loading?<div className="grid min-h-56 place-items-center rounded-2xl border bg-card"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>:claims.length===0?<div className="grid min-h-56 place-items-center rounded-2xl border bg-card p-8 text-center"><div><BadgeCheck className="mx-auto h-8 w-8 text-emerald-500"/><div className="mt-3 font-black">No claims waiting</div><p className="mt-1 text-sm text-muted-foreground">The authority queue is clear.</p></div></div>:<div className="space-y-3">{claims.map(claim=><ClaimCard key={claim.claim_id} claim={claim} working={workingId===claim.claim_id} note={notes[claim.claim_id]||''} onNote={value=>setNotes(current=>({...current,[claim.claim_id]:value}))} onReview={status=>void review(claim,status)}/>)}</div>}
  </div>;
}

function Metric({value,label}:{value:number;label:string}){return <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black tabular-nums">{value}</div><div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div></div>}
function ClaimCard({claim,working,note,onNote,onReview}:{claim:JoinClaim;working:boolean;note:string;onNote:(value:string)=>void;onReview:(status:'approved'|'rejected')=>void}){
 const Icon=claim.entity_type==='artist'?Music2:Building2; const hints=Object.entries(claim.evidence_hints||{}).filter(([,v])=>Boolean(v)); const evidence=claim.evidence||[];
 return <article className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"><div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
  <div className="min-w-0"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="h-5 w-5"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-black">{claim.entity_name||claim.entity_id}</h2><span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-500">{claim.requested_role}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">{statusLabel[claim.status]||claim.status}</span></div><div className="mt-1 text-xs text-muted-foreground">{claim.entity_type} · {relationLabel(claim.relationship_kind)} · {new Date(claim.created_at).toLocaleString('en-GB')}</div><div className="mt-1 break-all text-[10px] text-muted-foreground/70">user {claim.user_id}</div></div></div>
  <div className="mt-4 space-y-2">{evidence.length===0?<div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">Legacy evidence-free claim. Do not approve without an external check.</div>:evidence.map((item,index)=><div key={index} className="rounded-xl border bg-muted/30 p-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{item.type==='facebook_page_control'?<BadgeCheck className="h-3.5 w-3.5 text-emerald-500"/>:<MessageSquareText className="h-3.5 w-3.5"/>}{item.type?.replaceAll('_',' ')}</div>{item.explanation&&<p className="mt-2 whitespace-pre-wrap text-sm font-semibold">{item.explanation}</p>}{item.official_email&&<div className="mt-2 text-xs"><b>Official email:</b> {item.official_email}</div>}{item.supporting_url&&<a className="mt-2 flex items-center gap-1 break-all text-xs font-semibold text-primary" href={item.supporting_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3"/>{item.supporting_url}</a>}{item.page_id&&<div className="mt-2 text-xs"><b>Facebook Page:</b> {item.page_name||item.page_id} · {item.reconciliation||'unresolved'}</div>}</div>)}</div>
  {hints.length>0&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{hints.map(([key,value])=><div key={key} className="rounded-xl bg-muted/50 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{key.replace(/([A-Z])/g,' $1')}</div><div className="mt-0.5 break-words text-xs font-semibold">{value}</div></div>)}</div>}
  </div>
  <div><label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Review note</label><textarea value={note} onChange={event=>onNote(event.target.value)} placeholder="What did you verify?" className="mt-1.5 min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"/><div className="mt-2 grid grid-cols-2 gap-2"><Button variant="outline" disabled={working} className="gap-1.5 rounded-xl text-destructive hover:text-destructive" onClick={()=>onReview('rejected')}><XCircle className="h-4 w-4"/>Reject</Button><Button disabled={working} className="gap-1.5 rounded-xl" onClick={()=>onReview('approved')}>{working?<Loader2 className="h-4 w-4 animate-spin"/>:<BadgeCheck className="h-4 w-4"/>}Approve</Button></div></div>
 </div></article>;
}
