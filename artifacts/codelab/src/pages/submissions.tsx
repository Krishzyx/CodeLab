import { useState } from "react";
import { Link } from "wouter";
import { useListSubmissions } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Cpu } from "lucide-react";

export default function Submissions() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListSubmissions({ page, limit: 20 });

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="flex items-center gap-1.5 text-green-500 font-medium"><CheckCircle2 className="w-4 h-4" /> Accepted</span>;
      case 'wrong_answer':
        return <span className="flex items-center gap-1.5 text-red-500 font-medium"><XCircle className="w-4 h-4" /> Wrong Answer</span>;
      case 'time_limit_exceeded':
        return <span className="flex items-center gap-1.5 text-yellow-500 font-medium"><Clock className="w-4 h-4" /> TLE</span>;
      case 'runtime_error':
      case 'compilation_error':
        return <span className="flex items-center gap-1.5 text-orange-500 font-medium"><AlertTriangle className="w-4 h-4" /> Error</span>;
      case 'pending':
      case 'running':
        return <span className="flex items-center gap-1.5 text-blue-500 font-medium"><Cpu className="w-4 h-4 animate-pulse" /> Running...</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Submissions</h1>
        <p className="text-muted-foreground">History of your code submissions across all problems.</p>
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">Time Submitted</th>
              <th className="px-4 py-3 font-medium">Problem</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Runtime</th>
              <th className="px-4 py-3 font-medium">Language</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading submissions...</td></tr>
            ) : data?.submissions.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No submissions found. Go solve some problems!</td></tr>
            ) : (
              data?.submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${sub.problemId}`} className="font-medium hover:text-primary transition-colors">
                      {sub.problemTitle || `Problem #${sub.problemId}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusDisplay(sub.status)}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {sub.runtime ? `${sub.runtime} ms` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-secondary rounded-sm font-mono text-muted-foreground">
                      {sub.language}
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
