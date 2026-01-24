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
import Accounts from "@/pages/accounts";
import SetupAccounts from "@/pages/setup-accounts";
import Analytics from "@/pages/analytics";
import Business from "@/pages/business";
import Premium from "@/pages/premium";
import AiChat from "@/pages/ai-chat";
import ReferAndEarn from "@/pages/refer-and-earn";
import Backup from "@/pages/backup";
import CalendarIntegration from "@/pages/calendar-integration";
import SpreadsheetView from "@/pages/spreadsheet-view";

import Simulator from "@/pages/simulator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/permissions" component={Permissions} />
      <Route path="/setup-accounts" component={SetupAccounts} />
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Entry screens */}
      <Route path="/voice-entry" component={VoiceEntry} />
      <Route path="/photo-entry" component={PhotoEntry} />
      <Route path="/manual-entry" component={ManualEntry} />
      <Route path="/simulator" component={Simulator} />

      {/* Main sections */}
      <Route path="/transactions" component={Transactions} />
      <Route path="/goals" component={Goals} />
      <Route path="/investments" component={Investments} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/settings" component={Settings} />
      <Route path="/budget" component={Budget} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/business" component={Business} />
      <Route path="/premium" component={Premium} />
      <Route path="/ai-chat" component={AiChat} />
      <Route path="/refer-and-earn" component={ReferAndEarn} />
      <Route path="/backup" component={Backup} />
      <Route path="/calendar-integration" component={CalendarIntegration} />
      <Route path="/spreadsheet" component={SpreadsheetView} />

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
