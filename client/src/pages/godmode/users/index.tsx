import { useState, useEffect } from 'react';
import { User, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllUsers,
  deleteUser,
  type User as UserType,
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';

export default function UsersPage() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Users State
  const [users, setUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'completed' | 'incomplete' | 'with-bands' | 'no-bands'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 25;

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userFilter]);

  // User Handlers
  const handleUserDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Delete User',
      description: 'Delete this user? This will also delete all artist memberships for this user.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingUser(userId);
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingUser(null);
    }
  };

  // Filtered Data
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase())) ||
                        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
                        (u.phone && u.phone.includes(userSearch));
    if (!matchesSearch) return false;
    if (userFilter === 'completed') return u.profileCompleted;
    if (userFilter === 'incomplete') return !u.profileCompleted;
    if (userFilter === 'with-bands') return u.membershipCount > 0;
    if (userFilter === 'no-bands') return u.membershipCount === 0;
    return true;
  });

  // Pagination
  const userTotalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const userStartIndex = (userPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(userStartIndex, userStartIndex + usersPerPage);

  // Stats
  const userStats = {
    total: users.length,
    completed: users.filter(u => u.profileCompleted).length,
    incomplete: users.filter(u => !u.profileCompleted).length,
    withBands: users.filter(u => u.membershipCount > 0).length,
    noBands: users.filter(u => u.membershipCount === 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            Users
          </h1>
          <p className="text-muted-foreground mt-1">Manage users across the platform</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Input
            placeholder="Search users by name, email, or phone..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={fetchUsers} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={userFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setUserFilter('all')}
            size="sm"
          >
            All ({userStats.total})
          </Button>
          <Button
            variant={userFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setUserFilter('completed')}
            size="sm"
          >
            Complete ({userStats.completed})
          </Button>
          <Button
            variant={userFilter === 'incomplete' ? 'default' : 'outline'}
            onClick={() => setUserFilter('incomplete')}
            size="sm"
          >
            Incomplete ({userStats.incomplete})
          </Button>
          <Button
            variant={userFilter === 'with-bands' ? 'default' : 'outline'}
            onClick={() => setUserFilter('with-bands')}
            size="sm"
          >
            With Artists ({userStats.withBands})
          </Button>
          <Button
            variant={userFilter === 'no-bands' ? 'default' : 'outline'}
            onClick={() => setUserFilter('no-bands')}
            size="sm"
          >
            No Artists ({userStats.noBands})
          </Button>
        </div>
      </div>

      {usersLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
      {usersError && <div className="text-destructive text-center py-12">{usersError}</div>}

      {!usersLoading && !usersError && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Auth Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Display Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Profile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Artists</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                        {user.authType}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.displayName || <span className="text-muted-foreground italic">NULL</span>}</div>
                      {user.firstName && user.lastName && (
                        <div className="text-xs text-muted-foreground">{user.firstName} {user.lastName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{user.email || user.phone || <span className="text-muted-foreground italic">-</span>}</div>
                    </td>
                    <td className="px-4 py-3">
                      {user.profileCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{user.membershipCount}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUserDelete(user.id)}
                        disabled={deletingUser === user.id}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Users Pagination */}
          {userTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {userStartIndex + 1}-{Math.min(userStartIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserPage(p => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm">Page {userPage} of {userTotalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                  disabled={userPage === userTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
  );
}
