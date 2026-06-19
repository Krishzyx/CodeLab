import { useParams, Link } from "wouter";
import { useGetContest, getGetContestQueryKey, useGetContestLeaderboard, useRegisterContest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, Calendar, CheckCircle2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>();
  const contestId = parseInt(id, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contest, isLoading: isLoadingContest } = useGetContest(contestId, {
    query: { enabled: !!contestId, queryKey: getGetContestQueryKey(contestId) }
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useGetContestLeaderboard(contestId, {
    query: { enabled: !!contestId && contest?.status !== 'upcoming' }
  });

  const registerMutation = useRegisterContest();

  const handleRegister = () => {
    if (!user) {
      toast({ title: "Not logged in", description: "You must log in to register.", variant: "destructive" });
      return;
    }
    
    registerMutation.mutate({ data: { contestId } }, {
      onSuccess: () => {
        toast({ title: "Registered!", description: "You are now registered for this contest." });
        queryClient.invalidateQueries({ queryKey: getGetContestQueryKey(contestId) });
      },
      onError: (err: any) => {
        toast({ title: "Registration failed", description: err.error || "Failed to register", variant: "destructive" });
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  };

  if (isLoadingContest) {
    return <div className="p-8 text-center text-muted-foreground">Loading contest...</div>;
  }

  if (!contest) {
    return <div className="p-8 text-center text-destructive">Contest not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-2/3 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold">{contest.title}</h1>
              <span className={`px-2 py-1 text-xs font-bold rounded-sm ${
                contest.status === 'active' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                contest.status === 'upcoming' ? 'bg-blue-500/20 text-blue-500' :
                'bg-muted text-muted-foreground'
              }`}>
                {contest.status === 'active' ? 'LIVE NOW' : contest.status.toUpperCase()}
              </span>
            </div>
            <p className="text-lg text-muted-foreground mb-6">{contest.description}</p>
            
            <div className="flex flex-wrap gap-6 text-sm mb-8 bg-card p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">Start</div>
                  <div className="font-medium">{formatDate(contest.startTime)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">End</div>
                  <div className="font-medium">{formatDate(contest.endTime)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">Participants</div>
                  <div className="font-medium">{contest.participantCount}</div>
                </div>
              </div>
            </div>

            {contest.status === 'upcoming' && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                {contest.isRegistered ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">You're registered!</h3>
                    <p className="text-muted-foreground">The contest hasn't started yet. Check back when the time comes.</p>
                  </>
                ) : (
                  <>
                    <Trophy className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-xl font-bold mb-2">Ready to compete?</h3>
                    <p className="text-muted-foreground mb-6">Register now to secure your spot in this contest.</p>
                    <Button size="lg" className="font-bold" onClick={handleRegister} disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Registering..." : "Register for Contest"}
                    </Button>
                  </>
                )}
              </div>
            )}

            {contest.status !== 'upcoming' && contest.isRegistered && contest.problemIds && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Contest Problems</h3>
                <div className="grid gap-3">
                  {contest.problemIds.map((pid, idx) => (
                    <Link key={pid} href={`/problems/${pid}`}>
                      <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center font-bold text-muted-foreground">
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="font-medium group-hover:text-primary transition-colors">Problem {pid}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-2">
                            Solve <Play className="w-3 h-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {contest.status !== 'upcoming' && !contest.isRegistered && (
               <div className="bg-secondary/50 border border-border rounded-lg p-6 text-center">
                 <h3 className="text-lg font-bold mb-2">Not Registered</h3>
                 <p className="text-muted-foreground mb-4">You are not participating in this contest.</p>
                 {contest.status === 'active' && (
                    <Button onClick={handleRegister} disabled={registerMutation.isPending}>
                      Join Late
                    </Button>
                 )}
               </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/3">
          {contest.status !== 'upcoming' && (
            <Card className="bg-card border-border sticky top-20">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" /> Contest Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLeaderboard ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Loading ranks...</div>
                ) : leaderboard?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No submissions yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/30 text-muted-foreground text-xs">
                      <tr>
                        <th className="px-4 py-2 font-medium text-center w-12">#</th>
                        <th className="px-4 py-2 font-medium text-left">User</th>
                        <th className="px-4 py-2 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaderboard?.slice(0, 10).map((entry) => (
                        <tr key={entry.userId} className={user?.id === entry.userId ? "bg-primary/5" : ""}>
                          <td className="px-4 py-3 text-center font-medium">
                            {entry.rank <= 3 ? <span className="text-primary">{entry.rank}</span> : entry.rank}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/profile/${entry.username}`} className="hover:text-primary hover:underline font-medium">
                              {entry.username}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-primary font-bold">
                            {entry.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {leaderboard && leaderboard.length > 10 && (
                  <div className="p-3 border-t border-border/50 text-center">
                    <span className="text-xs text-muted-foreground">Top 10 shown.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
