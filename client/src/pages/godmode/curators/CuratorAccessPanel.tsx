import { useMemo, useState } from 'react';
import { Pencil, Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGodmodeUsers } from '../lib/queries';
import {
  setCuratorAccess,
  type CuratorAccess,
} from '@/lib/services/godmode-access-service';
import type { User } from '@/lib/services/godmode-service';

type CuratorUser = User & { curatorAccess?: CuratorAccess };

const DEFAULT_ACCESS: CuratorAccess = {
  scope: 'global',
  postcodePrefixes: [],
  ownRecordsOnly: false,
};

function accessOf(user: CuratorUser): CuratorAccess {
  return user.curatorAccess ?? DEFAULT_ACCESS;
}

function summary(access: CuratorAccess): string {
  const ownership = access.ownRecordsOnly ? 'their own records' : 'any records';
  if (access.scope === 'global') return `Can edit ${ownership} across bndy`;
  const areas = access.postcodePrefixes.join(', ') || 'no postcode areas';
  return `Can edit ${ownership} in ${areas}`;
}

function curatorName(user: CuratorUser): string {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || user.id;
}

export default function CuratorAccessPanel() {
  const usersQuery = useGodmodeUsers();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scope, setScope] = useState<'global' | 'postcode'>('global');
  const [postcodeText, setPostcodeText] = useState('');
  const [ownRecordsOnly, setOwnRecordsOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const curators = useMemo(
    () => ((usersQuery.data ?? []) as CuratorUser[]).filter((user) => user.role === 'curator'),
    [usersQuery.data],
  );

  const beginEdit = (user: CuratorUser) => {
    const access = accessOf(user);
    setEditingId(user.id);
    setScope(access.scope);
    setPostcodeText(access.postcodePrefixes.join(', '));
    setOwnRecordsOnly(access.ownRecordsOnly);
  };

  const cancelEdit = () => setEditingId(null);

  const save = async (user: CuratorUser) => {
    const postcodePrefixes = postcodeText
      .split(/[\s,]+/)
      .map((value) => value.trim().toUpperCase().replace(/\s+/g, ''))
      .filter(Boolean);

    if (scope === 'postcode' && postcodePrefixes.length === 0) {
      toast({ title: 'Add at least one postcode area or district', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await setCuratorAccess(user.id, {
        scope,
        postcodePrefixes: scope === 'postcode' ? Array.from(new Set(postcodePrefixes)) : [],
        ownRecordsOnly,
      });
      setEditingId(null);
      await usersQuery.refetch();
      toast({ title: 'Curator access updated', description: summary(result.curatorAccess) });
    } catch (error) {
      toast({
        title: 'Could not update curator access',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Curator access
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Limit a curator by postcode area and optionally to records they created. Unconfigured curators retain global access.
          </p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{curators.length} curator{curators.length === 1 ? '' : 's'}</span>
      </div>

      {usersQuery.isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Loading curators…</div>
      ) : usersQuery.isError ? (
        <div className="py-6 text-center text-sm text-destructive">{(usersQuery.error as Error).message}</div>
      ) : curators.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No users currently have the curator role.</div>
      ) : (
        <div className="divide-y rounded-md border">
          {curators.map((user) => {
            const access = accessOf(user);
            const editing = editingId === user.id;
            return (
              <div key={user.id} className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{curatorName(user)}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email || user.username}</div>
                    </div>
                  </div>

                  {!editing && (
                    <>
                      <div className="min-w-[130px] text-xs">
                        <div className="font-medium">{access.scope === 'global' ? 'Global' : 'Postcode limited'}</div>
                        <div className="text-muted-foreground">{access.scope === 'postcode' ? access.postcodePrefixes.join(', ') : 'All areas'}</div>
                      </div>
                      <div className="min-w-[120px] text-xs">
                        <div className="font-medium">{access.ownRecordsOnly ? 'Own records only' : 'Any record'}</div>
                        <div className="text-muted-foreground">{summary(access)}</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => beginEdit(user)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </>
                  )}
                </div>

                {editing && (
                  <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[180px_1fr_auto]">
                    <label className="text-xs font-medium">
                      Access
                      <select
                        value={scope}
                        onChange={(event) => setScope(event.target.value as 'global' | 'postcode')}
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="global">Global</option>
                        <option value="postcode">Limited by postcode</option>
                      </select>
                    </label>

                    <label className="text-xs font-medium">
                      Postcode areas / districts
                      <input
                        type="text"
                        value={postcodeText}
                        onChange={(event) => setPostcodeText(event.target.value)}
                        disabled={scope !== 'postcode'}
                        placeholder="ST, ST5, ST6, CW12"
                        className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="mt-1 block font-normal text-muted-foreground">Use ST for the whole area, or ST5/CW12 for specific districts.</span>
                    </label>

                    <div className="flex flex-col justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={ownRecordsOnly}
                          onChange={(event) => setOwnRecordsOnly(event.target.checked)}
                          className="h-4 w-4 rounded border"
                        />
                        Own records only
                      </label>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                        <Button size="sm" onClick={() => save(user)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
