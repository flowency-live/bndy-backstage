import { createContext, useContext, ReactNode } from 'react';
import type { Artist, ArtistMembership } from '@/types/api';

interface AdminContextValue {
  artistId: string;
  artistData: Artist | null;
  membership: ArtistMembership;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
}

interface AdminProviderProps {
  children: ReactNode;
  artistId: string;
  artistData: Artist | null;
  membership: ArtistMembership;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function AdminProvider({
  children,
  artistId,
  artistData,
  membership,
  isLoading,
  refetch
}: AdminProviderProps) {
  return (
    <AdminContext.Provider
      value={{
        artistId,
        artistData,
        membership,
        isLoading,
        refetch
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
