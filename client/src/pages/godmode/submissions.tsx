import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Mail, MessageCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  captureReviewsService,
  type CaptureResolutionState,
  type CaptureReview,
} from '@/lib/services/capture-reviews-service';
import { cn } from '@/lib/utils';
import { GodmodePageHeader } from './components/godmode-ui';

function submittedAt(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function CaptureRow({ item, active, onSelect }: { item: CaptureReview; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/70',
        active && 'bg-orange-500/10 ring-1 ring-inset ring-orange-500/30',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-orange-600 dark:text-orange-400">Needs review</span>
        <span className="text-xs text-muted-foreground">{submittedAt(item.receivedAt)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
        {item.sharedText || item.media.originalName || 'Poster submission'}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{item.sourceApp || 'capture'}</span>
        <span>·</span>
        <span>{item.processingAttempt || 1} processing attempt{item.processingAttempt === 1 ? '' : 's'}</span>
        {item.followUp && <><span>·</span><span>follow-up requested</span></>}
      </div>
    </button>
  );
}

export default function SubmissionsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<CaptureReview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CaptureReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [resolution, setResolution] = useState<CaptureResolutionState>('added');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await captureReviewsService.list();
      const oldestFirst = [...next].sort((left, right) => left.receivedAt.localeCompare(right.receivedAt));
      setItems(oldestFirst);
      setSelectedId((current) => current && oldestFirst.some((item) => item.id === current) ? current : oldestFirst[0]?.id || null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    captureReviewsService.get(selectedId)
      .then(setSelected)
      .catch((caught) => setError((caught as Error).message));
  }, [selectedId]);

  const completeAction = async (action: 'retry' | 'resolve') => {
    if (action === 'retry' && !reviewNote.trim()) {
      toast({ title: 'Add the missing context first', variant: 'destructive' });
      return;
    }
    if (!selected) return;
    setWorking(true);
    try {
      if (action === 'retry') await captureReviewsService.retry(selected.id, reviewNote.trim());
      else await captureReviewsService.resolve(selected.id, resolution, reviewNote.trim());
      toast({
        title: action === 'retry' ? 'Sent back for an immediate check' : 'Review completed',
        description: selected.followUp
          ? `Follow-up status will be recorded for ${selected.followUp.method}.`
          : 'No follow-up was requested.',
      });
      setReviewNote('');
      setSelected(null);
      await loadList();
    } catch (caught) {
      toast({ title: 'Could not update this submission', description: (caught as Error).message, variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={Inbox}
        title="Submissions"
        count={`${items.length} waiting`}
        isFetching={loading}
        onRefresh={loadList}
      />

      {error && (
        <Card className="flex items-center gap-2 border-destructive p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <h2 className="font-black">Nothing waiting</h2>
          <p className="mt-1 text-sm text-muted-foreground">Every Capture submission has a terminal answer.</p>
        </Card>
      )}

      {items.length > 0 && (
        <div className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-xl border bg-card xl:grid-cols-[minmax(280px,360px)_1fr]">
          <aside className="max-h-[360px] overflow-auto border-b bg-muted/20 xl:max-h-none xl:border-b-0 xl:border-r">
            <div className="border-b px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Oldest attention first</div>
            {items.map((item) => (
              <CaptureRow key={item.id} item={item} active={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />
            ))}
          </aside>

          <section className="min-w-0 p-5 lg:p-7">
            {!selected && <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading submission…</div>}
            {selected && (
              <div className="mx-auto max-w-4xl space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">Human check required</div>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Capture submission</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{submittedAt(selected.receivedAt)} · {selected.id}</p>
                  </div>
                  {selected.followUp && (
                    <div className="rounded-xl border bg-background px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 font-bold">
                        {selected.followUp.method === 'email' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                        Follow-up requested
                      </div>
                      <div className="mt-1 text-muted-foreground">{selected.followUp.contact}</div>
                    </div>
                  )}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_1.1fr]">
                  <div className="space-y-4">
                    <Card className="overflow-hidden">
                      {selected.media.url ? (
                        <img src={selected.media.url} alt="Submitted gig poster" className="max-h-[520px] w-full bg-black/5 object-contain" />
                      ) : (
                        <div className="grid h-52 place-items-center text-sm text-muted-foreground">No poster attached</div>
                      )}
                    </Card>
                    {selected.sharedText && (
                      <Card className="p-4">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">Submitted text</div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.sharedText}</p>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Card className="border-orange-500/30 bg-orange-500/5 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Why automation stopped</div>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{selected.note || selected.publicMessage || 'No processor note recorded.'}</pre>
                    </Card>

                    <Card className="space-y-4 p-4">
                      <div>
                        <h3 className="font-black">Add context and try again</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Give Backline the missing fact. It will re-run immediately and retain the original evidence.</p>
                      </div>
                      <Textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} placeholder="For example: the venue is The Castle Hotel, Manchester, and doors are at 19:30." />
                      <Button disabled={working} onClick={() => completeAction('retry')} className="w-full">
                        <RotateCcw className="mr-2 h-4 w-4" /> Retry now
                      </Button>
                    </Card>

                    <Card className="space-y-4 p-4">
                      <div>
                        <h3 className="font-black">Close the review</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Use this after checking or adding the gig manually.</p>
                      </div>
                      <select value={resolution} onChange={(event) => setResolution(event.target.value as CaptureResolutionState)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="added">Gig added</option>
                        <option value="already_exists">Already on bndy</option>
                        <option value="could_not_resolve">Could not resolve safely</option>
                        <option value="ignored">Not a live music event</option>
                      </select>
                      <Button disabled={working} variant="outline" onClick={() => completeAction('resolve')} className="w-full">
                        {working ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Complete review
                      </Button>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
