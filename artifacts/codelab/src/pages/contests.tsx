import { useListContests } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, Calendar } from "lucide-react";

export default function Contests() {
  const { data: upcomingData } = useListContests({ status: "upcoming" });
  const { data: activeData } = useListContests({ status: "active" });
  const { data: endedData } = useListContests({ status: "ended" });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  };

  const ContestCard = ({ contest }: { contest: any }) => (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl mb-2">{contest.title}</CardTitle>
            <CardDescription className="line-clamp-2">{contest.description}</CardDescription>
          </div>
          {contest.status === 'active' && (
            <span className="px-2 py-1 text-xs font-bold bg-red-500/20 text-red-500 rounded animate-pulse whitespace-nowrap">
              LIVE NOW
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Starts: {formatDate(contest.startTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Ends: {formatDate(contest.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{contest.participantCount} Participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>{contest.problemCount} Problems</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/contests/${contest.id}`} className="w-full">
          <Button className="w-full font-bold" variant={contest.status === 'active' ? 'default' : 'outline'}>
            {contest.status === 'active' ? 'Enter Contest' : contest.status === 'upcoming' ? 'View Details' : 'View Leaderboard'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contests</h1>
        <p className="text-muted-foreground">Compete against others in real-time to test your skills under pressure.</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="active">Active Contests</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ended">Past Contests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          {!activeData || activeData.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No active contests</h3>
              <p className="text-muted-foreground">There are no contests running right now. Check the upcoming tab.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {activeData.map(c => <ContestCard key={c.id} contest={c} />)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-6">
          {!upcomingData || upcomingData.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No upcoming contests</h3>
              <p className="text-muted-foreground">Check back later for newly scheduled contests.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {upcomingData.map(c => <ContestCard key={c.id} contest={c} />)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="ended" className="space-y-6">
          {!endedData || endedData.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No past contests</h3>
              <p className="text-muted-foreground">There is no contest history yet.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {endedData.map(c => <ContestCard key={c.id} contest={c} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
