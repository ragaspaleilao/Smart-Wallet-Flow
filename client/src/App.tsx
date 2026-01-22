import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { NotificationListenerSimulator } from "@/components/notification-listener-simulator";

// Pages
import Onboarding from "@/pages/onboarding";
import Permissions from "@/pages/permissions";
import Dashboard from "@/pages/dashboard";
import VoiceEntry from "@/pages/voice-entry";
import PhotoEntry from "@/pages/photo-entry";
import ManualEntry from "@/pages/manual-entry";
import Transactions from "@/pages/transactions";
import Goals from "@/pages/goals";
import Investments from "@/pages/investments";
import Vehicles from "@/pages/vehicles";
import Settings from "@/pages/settings";
import Budget from "@/pages/budget";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/permissions" component={Permissions} />
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Entry screens */}
      <Route path="/voice-entry" component={VoiceEntry} />
      <Route path="/photo-entry" component={PhotoEntry} />
      <Route path="/manual-entry" component={ManualEntry} />

      {/* Main sections */}
      <Route path="/transactions" component={Transactions} />
      <Route path="/goals" component={Goals} />
      <Route path="/investments" component={Investments} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/settings" component={Settings} />
      <Route path="/budget" component={Budget} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <NotificationListenerSimulator />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
