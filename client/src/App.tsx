import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SupabaseAuthProvider } from "@/hooks/useSupabaseAuth.tsx";
import { UserProvider } from "@/lib/user-context";
import BandGate from "@/components/band-gate";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Invite from "@/pages/invite";
import Calendar from "@/pages/calendar";
import Songs from "@/pages/songs";
import Admin from "@/pages/admin";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/auth/login";
import NotFound from "@/pages/not-found";
import Footer from "@/components/ui/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/invite/:token" component={Invite} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard">
        <BandGate>
          {({ bandId, membership }) => (
            <Dashboard bandId={bandId} membership={membership} />
          )}
        </BandGate>
      </Route>
      <Route path="/calendar">
        <BandGate>
          {({ bandId, membership }) => (
            <Calendar bandId={bandId} membership={membership} />
          )}
        </BandGate>
      </Route>
      <Route path="/songs">
        <BandGate>
          {({ bandId, membership }) => (
            <Songs bandId={bandId} membership={membership} />
          )}
        </BandGate>
      </Route>
      <Route path="/admin">
        <BandGate>
          {({ bandId, membership }) => (
            <Admin bandId={bandId} membership={membership} />
          )}
        </BandGate>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SupabaseAuthProvider>
          <UserProvider>
            <div className="min-h-screen flex flex-col">
              <div className="flex-1">
                <Router />
              </div>
              <Footer />
            </div>
            <Toaster />
          </UserProvider>
        </SupabaseAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;