import { useState } from "react";
import { Link } from "wouter";
import { useListProblems, ListProblemsDifficulty, ListProblemsStatus } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Circle, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; // We need to create this

export default function Problems() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [difficulty, setDifficulty] = useState<ListProblemsDifficulty | "all">("all");
  const [status, setStatus] = useState<ListProblemsStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListProblems({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    difficulty: difficulty !== "all" ? difficulty : undefined,
    status: status !== "all" ? status : undefined,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Problem Set</h1>
          <p className="text-muted-foreground">Solve algorithms to improve your skills.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search problems..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={difficulty} onValueChange={(val) => setDifficulty(val as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(val) => setStatus(val as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="solved">Solved</SelectItem>
              <SelectItem value="attempted">Attempted</SelectItem>
              <SelectItem value="unsolved">Unsolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium w-16 text-center">Status</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium w-32">Acceptance</th>
              <th className="px-4 py-3 font-medium w-32">Difficulty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading problems...</td></tr>
            ) : data?.problems.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No problems found.</td></tr>
            ) : (
              data?.problems.map((problem) => (
                <tr key={problem.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-4 py-3 text-center">
                    {problem.userStatus === "solved" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                    ) : problem.userStatus === "attempted" ? (
                      <Clock className="w-5 h-5 text-yellow-500 mx-auto" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30 mx-auto group-hover:text-muted-foreground/60 transition-colors" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${problem.id}`} className="font-medium hover:text-primary transition-colors block">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page * 20 >= data.total}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
