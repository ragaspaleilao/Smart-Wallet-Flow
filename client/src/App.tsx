import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Landing from "@/pages/landing";
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
import CreditCards from "@/pages/credit-cards";
import HelpSupport from "@/pages/help-support";
import TermsPrivacy from "@/pages/terms-privacy";
import Subscriptions from "@/pages/subscriptions";
import AddSubscription from "@/pages/add-subscription";
import CancelSubscription from "@/pages/cancel-subscription";

import Simulator from "@/pages/simulator";

function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <Dashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/onboarding" component={Onboarding} />
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
      <Route path="/credit-cards" component={CreditCards} />
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
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/help-support" component={HelpSupport} />
      <Route path="/terms-privacy" component={TermsPrivacy} />
      <Route path="/add-subscription" component={AddSubscription} />
      <Route path="/cancel-subscription" component={CancelSubscription} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
