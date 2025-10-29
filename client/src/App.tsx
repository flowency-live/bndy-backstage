import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServerAuthProvider } from "@/hooks/useServerAuth";
import { UserProvider } from "@/lib/user-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { GoogleMapsProvider } from "@/components/providers/google-maps-provider";
import MemberGate from "@/components/member-gate";
import ProfileGate from "@/components/profile-gate";
import Layout, { AppLayout } from "@/components/layout";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MyArtists from "@/pages/my-artists";
import Invite from "@/pages/invite";
import Calendar from "@/pages/calendar";
import Songs from "@/pages/songs";
import Setlists from "@/pages/setlists";
import SetlistEditor from "@/pages/setlist-editor";
import SetlistPrint from "@/pages/setlist-print";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Gigs from "@/pages/gigs";
import Admin from "@/pages/admin";
import Members from "@/pages/members";
import Issues from "@/pages/issues";
import AgentEvents from "@/pages/agentevents";
import Login from "@/pages/auth/login";
import OAuthCallback from "@/pages/auth/callback";
import AuthSuccess from "@/pages/auth-success";
import OAuthResult from "@/pages/oauth-result";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

// Godmode pages
import GodmodeLayout from "@/pages/godmode/GodmodeLayout";
import GodmodeDashboard from "@/pages/godmode/Dashboard";
import VenuesPage from "@/pages/godmode/venues";
import EnrichmentQueuePage from "@/pages/godmode/venues/enrichment";
import ArtistsPage from "@/pages/godmode/artists";
import SongsPageGodmode from "@/pages/godmode/songs";
import UsersPage from "@/pages/godmode/users";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={OAuthCallback} />
      <Route path="/auth-success" component={AuthSuccess} />
      <Route path="/test-auth" component={AuthSuccess} />
      <Route path="/oauth-result" component={OAuthResult} />
      <Route path="/invite/:token" component={Invite} />
      <Route path="/profile">
        <AppLayout>
          <Profile />
        </AppLayout>
      </Route>
      <Route path="/dashboard">
        <MemberGate allowNoContextForDashboard={true}>
          {({ contextId, membership, userProfile }) => (
            <ProfileGate userProfile={userProfile}>
              <AppLayout artistId={contextId} membership={membership}>
                <Dashboard artistId={contextId} membership={membership} userProfile={userProfile} />
              </AppLayout>
            </ProfileGate>
          )}
        </MemberGate>
      </Route>
      <Route path="/my-artists">
        <MemberGate allowNoContextForDashboard={true}>
          {({ userProfile }) => (
            <ProfileGate userProfile={userProfile}>
              <AppLayout>
                <MyArtists />
              </AppLayout>
            </ProfileGate>
          )}
        </MemberGate>
      </Route>
      <Route path="/calendar">
        <MemberGate>
          {({ contextId, membership, userProfile }) => (
            <ProfileGate userProfile={userProfile}>
              <AppLayout artistId={contextId} membership={membership}>
                <Calendar artistId={contextId} membership={membership} />
              </AppLayout>
            </ProfileGate>
          )}
        </MemberGate>
      </Route>
      <Route path="/gigs">
        <MemberGate>
          {({ contextId, membership, userProfile }) => {
            if (!contextId || !membership) return null;
            return (
              <ProfileGate userProfile={userProfile}>
                <AppLayout artistId={contextId} membership={membership}>
                  <Gigs artistId={contextId} />
                </AppLayout>
              </ProfileGate>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/songs">
        <MemberGate>
          {({ contextId, membership, userProfile }) => {
            if (!contextId || !membership) return null;
            return (
              <ProfileGate userProfile={userProfile}>
                <AppLayout artistId={contextId} membership={membership}>
                  <Songs artistId={contextId} membership={membership} />
                </AppLayout>
              </ProfileGate>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/setlists">
        <MemberGate>
          {({ contextId, membership, userProfile }) => {
            if (!contextId || !membership) return null;
            return (
              <ProfileGate userProfile={userProfile}>
                <AppLayout artistId={contextId} membership={membership}>
                  <Setlists artistId={contextId} membership={membership} />
                </AppLayout>
              </ProfileGate>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/artists/:artistId/setlists/:setlistId/print">
        {(params) => (
          <MemberGate>
            {({ contextId, membership, userProfile }) => {
              if (!contextId || !membership) return null;
              return (
                <ProfileGate userProfile={userProfile}>
                  <SetlistPrint artistId={params.artistId} setlistId={params.setlistId} />
                </ProfileGate>
              );
            }}
          </MemberGate>
        )}
      </Route>
      <Route path="/setlists/:setlistId">
        {(params) => (
          <MemberGate>
            {({ contextId, membership, userProfile }) => {
              if (!contextId || !membership) return null;
              return (
                <ProfileGate userProfile={userProfile}>
                  <AppLayout artistId={contextId} membership={membership}>
                    <ErrorBoundary>
                      <SetlistEditor artistId={contextId} setlistId={params.setlistId} membership={membership} />
                    </ErrorBoundary>
                  </AppLayout>
                </ProfileGate>
              );
            }}
          </MemberGate>
        )}
      </Route>
      <Route path="/admin">
        <MemberGate>
          {({ contextId, membership, userProfile }) => {
            if (!contextId || !membership) return null;
            return (
              <ProfileGate userProfile={userProfile}>
                <AppLayout artistId={contextId} membership={membership}>
                  <Admin artistId={contextId} membership={membership} />
                </AppLayout>
              </ProfileGate>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/members">
        <MemberGate>
          {({ contextId, membership, userProfile }) => {
            if (!contextId || !membership) return null;
            return (
              <ProfileGate userProfile={userProfile}>
                <AppLayout artistId={contextId} membership={membership}>
                  <Members artistId={contextId} membership={membership} />
                </AppLayout>
              </ProfileGate>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/issues">
        <AppLayout>
          <Issues />
        </AppLayout>
      </Route>

      {/* Godmode Routes */}
      <Route path="/godmode">
        <GodmodeLayout>
          <GodmodeDashboard />
        </GodmodeLayout>
      </Route>
      <Route path="/godmode/venues">
        <GodmodeLayout>
          <VenuesPage />
        </GodmodeLayout>
      </Route>
      <Route path="/godmode/venues/enrichment">
        <GodmodeLayout>
          <EnrichmentQueuePage />
        </GodmodeLayout>
      </Route>
      <Route path="/godmode/artists">
        <GodmodeLayout>
          <ArtistsPage />
        </GodmodeLayout>
      </Route>
      <Route path="/godmode/songs">
        <GodmodeLayout>
          <SongsPageGodmode />
        </GodmodeLayout>
      </Route>
      <Route path="/godmode/users">
        <GodmodeLayout>
          <UsersPage />
        </GodmodeLayout>
      </Route>
      <Route path="/godmode/events">
        <GodmodeLayout>
          <AgentEvents />
        </GodmodeLayout>
      </Route>

      {/* Legacy agentevents route - redirects to godmode */}
      <Route path="/agentevents">
        <GodmodeLayout>
          <AgentEvents />
        </GodmodeLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="bndy-ui-theme">
          <ServerAuthProvider>
            <UserProvider>
              <GoogleMapsProvider>
                <Layout>
                  <div className="min-h-screen flex flex-col max-w-full overflow-x-hidden">
                    <div className="flex-1">
                      <Router />
                    </div>
                  </div>
                  <Toaster />
                </Layout>
              </GoogleMapsProvider>
            </UserProvider>
        </ServerAuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
}

export default App;
