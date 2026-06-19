import { useGetLeaderboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Trophy, Medal, Star } from "lucide-react";

export default function Leaderboard() {
  const { data, isLoading } = useGetLeaderboard({ limit: 100 });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">Global Leaderboard</h1>
          <p className="text-muted-foreground">The top competitive programmers on CodeLab.</p>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium w-24 text-center">Rank</th>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium text-right w-32">Score</th>
              <th className="px-6 py-4 font-medium text-right w-32">Solved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading leaderboard...</td></tr>
            ) : data?.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No data available.</td></tr>
            ) : (
              data?.map((entry) => (
                <tr key={entry.userId} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 text-center font-bold">
                    {entry.rank === 1 ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto" /> :
                     entry.rank === 2 ? <Medal className="w-5 h-5 text-gray-400 mx-auto" /> :
                     entry.rank === 3 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                     entry.rank}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/profile/${entry.username}`} className="font-bold hover:text-primary transition-colors flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                      {entry.username}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-primary font-bold">
                    {entry.score.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                    {entry.solvedCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
