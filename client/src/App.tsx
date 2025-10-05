import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServerAuthProvider } from "@/hooks/useServerAuth";
import { UserProvider } from "@/lib/user-context";
import { ThemeProvider } from "@/contexts/theme-context";
import MemberGate from "@/components/member-gate";
import Layout, { AppLayout } from "@/components/layout";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MyArtists from "@/pages/my-artists";
import Invite from "@/pages/invite";
import Calendar from "@/pages/calendar";
import Songs from "@/pages/songs";
import Admin from "@/pages/admin";
import Issues from "@/pages/issues";
import Godmode from "@/pages/godmode";
// Onboarding removed - artist creation now in dashboard
import Login from "@/pages/auth/login";
import OAuthCallback from "@/pages/auth/callback";
import AuthSuccess from "@/pages/auth-success";
import OAuthResult from "@/pages/oauth-result";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Footer from "@/components/ui/footer";

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
            <AppLayout artistId={contextId} membership={membership}>
              <Dashboard artistId={contextId} membership={membership} userProfile={userProfile} />
            </AppLayout>
          )}
        </MemberGate>
      </Route>
      <Route path="/my-artists">
        <MemberGate allowNoContextForDashboard={true}>
          {({ userProfile }) => (
            <AppLayout>
              <MyArtists />
            </AppLayout>
          )}
        </MemberGate>
      </Route>
      <Route path="/calendar">
        <MemberGate>
          {({ contextId, membership }) => {
            if (!contextId || !membership) return null;
            return (
              <AppLayout artistId={contextId} membership={membership}>
                <Calendar artistId={contextId} membership={membership} />
              </AppLayout>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/songs">
        <MemberGate>
          {({ contextId, membership }) => {
            if (!contextId || !membership) return null;
            return (
              <AppLayout artistId={contextId} membership={membership}>
                <Songs artistId={contextId} membership={membership} />
              </AppLayout>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/admin">
        <MemberGate>
          {({ contextId, membership }) => {
            if (!contextId || !membership) return null;
            return (
              <AppLayout artistId={contextId} membership={membership}>
                <Admin artistId={contextId} membership={membership} />
              </AppLayout>
            );
          }}
        </MemberGate>
      </Route>
      <Route path="/issues">
        <AppLayout>
          <Issues />
        </AppLayout>
      </Route>
      <Route path="/godmode">
        <AppLayout>
          <Godmode />
        </AppLayout>
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
              <Layout>
                <div className="min-h-screen flex flex-col">
                  <div className="flex-1">
                    <Router />
                  </div>
                  <Footer />
                </div>
                <Toaster />
              </Layout>
            </UserProvider>
        </ServerAuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
}

export default App;