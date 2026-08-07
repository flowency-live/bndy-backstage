// Godmode › Users — dense table on the shared DataTable.

import { useMemo, useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import {
  BoolMark,
  FacetChips,
  GodmodePageHeader,
  TableSearch,
  useInitialUrlFilter,
} from '../components/godmode-ui';
import { useDeleteUser, useGodmodeUsers } from '../lib/queries';

export default function UsersPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  const usersQuery = useGodmodeUsers();
  const deleteUser = useDeleteUser();
  const users = usersQuery.data ?? [];

  const [facet, setFacet] = useInitialUrlFilter('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hit =
          (u.displayName && u.displayName.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(search.trim()));
        if (!hit) return false;
      }
      switch (facet) {
        case 'completed': return u.profileCompleted;
        case 'incomplete': return !u.profileCompleted;
        case 'with-artists': return u.membershipCount > 0;
        case 'no-artists': return u.membershipCount === 0;
        default: return true;
      }
    });
  }, [users, search, facet]);

  const facets = useMemo(
    () => [
      { value: 'all', label: 'All', count: users.length },
      { value: 'completed', label: 'Complete profile', count: users.filter((u) => u.profileCompleted).length },
      { value: 'incomplete', label: 'Incomplete', count: users.filter((u) => !u.profileCompleted).length, warn: true },
      { value: 'with-artists', label: 'With artists', count: users.filter((u) => u.membershipCount > 0).length },
      { value: 'no-artists', label: 'No artists', count: users.filter((u) => u.membershipCount === 0).length },
    ],
    [users],
  );

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: 'Delete User',
      description: `Delete "${user.displayName || user.username}"? This also deletes all of their artist memberships.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteUser.mutateAsync(user.id);
      toast({ title: 'User deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Display name',
      sortValue: (u) => u.displayName || u.username,
      render: (u) => (
        <span className="flex flex-col leading-tight">
          <span className="font-medium truncate">
            {u.displayName || <span className="italic text-muted-foreground">no display name</span>}
          </span>
          {u.firstName && u.lastName && (
            <span className="text-[11px] text-muted-foreground truncate">
              {u.firstName} {u.lastName}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      sortValue: (u) => u.email || u.phone,
      render: (u) => <span className="text-muted-foreground truncate">{u.email || u.phone || '—'}</span>,
    },
    {
      key: 'auth',
      header: 'Auth',
      widthClass: 'w-24',
      sortValue: (u) => u.authType,
      render: (u) => (
        <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{u.authType}</span>
      ),
    },
    {
      key: 'profile',
      header: 'Profile',
      widthClass: 'w-20',
      sortValue: (u) => (u.profileCompleted ? 1 : 0),
      render: (u) => <BoolMark value={u.profileCompleted} warnWhenMissing />,
    },
    {
      key: 'artists',
      header: 'Artists',
      align: 'right',
      widthClass: 'w-20',
      sortValue: (u) => u.membershipCount,
      render: (u) => u.membershipCount,
    },
    {
      key: 'created',
      header: 'Created',
      widthClass: 'w-28',
      className: 'hidden lg:table-cell',
      sortValue: (u) => u.createdAt,
      render: (u) => (
        <span className="text-muted-foreground text-xs">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-14',
      render: (u) => (
        <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete user"
            onClick={() => handleDelete(u)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={Users}
        title="Users"
        count={`${filtered.length.toLocaleString()} of ${users.length.toLocaleString()}`}
        isFetching={usersQuery.isFetching}
        onRefresh={() => usersQuery.refetch()}
      />

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch value={search} onChange={setSearch} placeholder="Search name, email, phone…" />
        <FacetChips facets={facets} active={facet} onChange={setFacet} />
      </div>

      {usersQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(usersQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(u) => u.id}
          defaultSort={{ key: 'created', dir: 'desc' }}
          emptyMessage={usersQuery.isLoading ? 'Loading users…' : 'No users match the current filters.'}
        />
      )}

      <ConfirmDialog />
    </div>
  );
}
