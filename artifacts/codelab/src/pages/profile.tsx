import { useParams } from "wouter";
import { useGetUserProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Code2, Star, Trophy, Calendar } from "lucide-react";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = useGetUserProfile(username);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  if (error || !profile) return <div className="p-8 text-center text-destructive">User not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <Card className="w-full md:w-1/3 bg-card border-border shrink-0">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl font-bold mb-4 text-primary border-4 border-background shadow-xl">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold mb-1">{profile.username}</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            {profile.bio && <p className="text-sm mb-6">{profile.bio}</p>}
            
            <div className="w-full grid grid-cols-2 gap-4 mt-2 pt-6 border-t border-border">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Rank</span>
                <span className="text-2xl font-bold font-mono">{profile.rank}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Solved</span>
                <span className="text-2xl font-bold font-mono">{profile.solvedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="w-full flex-1 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Activity Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Easy Solved</div>
                  <div className="text-2xl font-bold text-green-500 font-mono">--</div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Medium Solved</div>
                  <div className="text-2xl font-bold text-yellow-500 font-mono">--</div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Hard Solved</div>
                  <div className="text-2xl font-bold text-red-500 font-mono">--</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
