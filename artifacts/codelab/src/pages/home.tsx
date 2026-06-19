import { Link } from "wouter";
import { useGetDashboardStats, useListProblems } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Trophy, Activity, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: stats } = useGetDashboardStats({ query: { retry: false } });
  const { data: recentProblems } = useListProblems({ limit: 5 }, { query: { retry: false } });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <section className="py-12 md:py-20 flex flex-col items-center text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          Grind <span className="text-primary">Harder.</span><br />
          Code <span className="text-primary">Faster.</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg md:text-xl">
          The ultimate cockpit for competitive programmers. Solve challenging algorithmic problems, compete in real-time contests, and climb the global leaderboard.
        </p>
        <div className="flex items-center gap-4 pt-4">
          <Link href="/problems">
            <Button size="lg" className="gap-2 font-bold">
              <Code2 className="w-5 h-5" /> Start Coding
            </Button>
          </Link>
          <Link href="/contests">
            <Button size="lg" variant="outline" className="gap-2">
              <Trophy className="w-5 h-5" /> View Contests
            </Button>
          </Link>
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Global Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.rank || "N/A"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" /> Total Solved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSolved} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalProblems}</span></div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-500">E: {stats.easySolved}</span>
                <span className="text-yellow-500">M: {stats.mediumSolved}</span>
                <span className="text-red-500">H: {stats.hardSolved}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.streak} <span className="text-sm font-normal text-muted-foreground">days</span></div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Problems</h2>
          <Link href="/problems">
            <Button variant="ghost" className="gap-2">View all <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
        
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Acceptance</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentProblems?.problems.map(problem => (
                <tr key={problem.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    {problem.userStatus === 'solved' ? (
                      <span className="text-green-500 font-bold">AC</span>
                    ) : problem.userStatus === 'attempted' ? (
                      <span className="text-yellow-500 font-bold">AT</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${problem.id}`} className="hover:text-primary transition-colors font-medium">
                      {problem.id}. {problem.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(problem.acceptanceRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-sm ${
                      problem.difficulty === 'easy' ? 'bg-green-500/10 text-green-500' :
                      problem.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {problem.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
