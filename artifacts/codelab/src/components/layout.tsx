import { Link, useLocation } from "wouter";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Code2, Trophy, List, Activity, User, LogOut, Shield } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/problems", label: "Problems", icon: Code2 },
    { href: "/contests", label: "Contests", icon: Trophy },
    { href: "/leaderboard", label: "Leaderboard", icon: List },
  ];

  if (user) {
    navItems.push({ href: "/submissions", label: "Submissions", icon: Activity });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-mono">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-primary flex items-center gap-2 text-lg">
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">&gt;_</span>
              CodeLab
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link href="/admin/problems" className="mr-2">
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href={`/profile/${user.username}`}>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    {user.username}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-8">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="h-8">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
