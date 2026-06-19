import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Layout } from "@/components/layout";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Problems from "@/pages/problems";
import ProblemDetail from "@/pages/problem-detail";
import Submissions from "@/pages/submissions";
import Contests from "@/pages/contests";
import ContestDetail from "@/pages/contest-detail";
import Leaderboard from "@/pages/leaderboard";
import Profile from "@/pages/profile";
import AdminProblems from "@/pages/admin-problems";
import AdminContests from "@/pages/admin-contests";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType<any>, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/" />;

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        <Route path="/problems" component={Problems} />
        <Route path="/problems/:id" component={ProblemDetail} />
        <Route path="/submissions">
          {() => <ProtectedRoute component={Submissions} />}
        </Route>
        
        <Route path="/contests" component={Contests} />
        <Route path="/contests/:id" component={ContestDetail} />
        
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/profile/:username" component={Profile} />

        <Route path="/admin/problems">
          {() => <ProtectedRoute component={AdminProblems} adminOnly={true} />}
        </Route>
        <Route path="/admin/contests">
          {() => <ProtectedRoute component={AdminContests} adminOnly={true} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
