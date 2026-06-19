import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProblem, getGetProblemQueryKey,
  useRunCode, useSubmitCode, 
  useGetSubmission, getGetSubmissionQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Cpu, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C++" },
  { id: "c", name: "C" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
  { id: "ruby", name: "Ruby" },
  { id: "php", name: "PHP" }
];

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const problemId = parseInt(id, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: problem, isLoading: isLoadingProblem } = useGetProblem(problemId, {
    query: { enabled: !!problemId, queryKey: getGetProblemQueryKey(problemId) }
  });

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [resultTab, setResultTab] = useState("testcases");

  const runCodeMutation = useRunCode();
  const submitCodeMutation = useSubmitCode();
  
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  
  // Polling for submission status
  const { data: submission } = useGetSubmission(activeSubmissionId!, {
    query: {
      enabled: !!activeSubmissionId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "pending" || status === "running") return 2000;
        return false; // Stop polling
      },
      queryKey: getGetSubmissionQueryKey(activeSubmissionId!)
    }
  });

  const [runResult, setRunResult] = useState<any>(null);

  useEffect(() => {
    if (problem?.starterCode && !code) {
      setCode(problem.starterCode);
    }
  }, [problem, code]);

  useEffect(() => {
    if (submission && submission.status !== "pending" && submission.status !== "running") {
      setResultTab("submission");
      
      if (submission.status === "accepted") {
        toast({ title: "Accepted!", description: "All test cases passed.", variant: "default" });
        queryClient.invalidateQueries({ queryKey: getGetProblemQueryKey(problemId) });
      } else {
        toast({ title: "Submission Failed", description: submission.status, variant: "destructive" });
      }
    }
  }, [submission, problemId, queryClient, toast]);

  const handleRun = () => {
    if (!user) {
      toast({ title: "Not logged in", description: "You must be logged in to run code.", variant: "destructive" });
      return;
    }
    
    if (!problem?.testCases?.length) {
      toast({ title: "No test cases", description: "This problem has no public test cases to run against." });
      return;
    }

    setResultTab("run");
    setRunResult(null);

    // Run against the first test case for simplicity in the UI
    const testCase = problem.testCases[0];

    runCodeMutation.mutate({
      data: {
        language,
        code,
        input: testCase.input
      }
    }, {
      onSuccess: (res) => {
        setRunResult({ ...res, testCase });
      },
      onError: (err: any) => {
        toast({ title: "Run Error", description: err.error || "Failed to run code", variant: "destructive" });
      }
    });
  };

  const handleSubmit = () => {
    if (!user) {
      toast({ title: "Not logged in", description: "You must be logged in to submit code.", variant: "destructive" });
      return;
    }

    setResultTab("submission");
    setActiveSubmissionId(null);

    submitCodeMutation.mutate({
      data: {
        problemId,
        language,
        code
      }
    }, {
      onSuccess: (res) => {
        setActiveSubmissionId(res.id);
        toast({ title: "Code Submitted", description: "Waiting for results..." });
      },
      onError: (err: any) => {
        toast({ title: "Submit Error", description: err.error || "Failed to submit code", variant: "destructive" });
      }
    });
  };

  if (isLoadingProblem) {
    return <div className="p-8 text-center text-muted-foreground flex items-center justify-center h-[calc(100vh-3.5rem)]"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!problem) {
    return <div className="p-8 text-center text-destructive">Problem not found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-4 px-2">
          <h1 className="font-bold">{problem.id}. {problem.title}</h1>
          <span className={`px-2 py-0.5 text-xs rounded-sm ${
            problem.difficulty === 'easy' ? 'bg-green-500/10 text-green-500' :
            problem.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-red-500/10 text-red-500'
          }`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.id} value={lang.id}>{lang.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" className="h-8 gap-2" onClick={handleRun} disabled={runCodeMutation.isPending}>
            {runCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run
          </Button>
          <Button size="sm" className="h-8 gap-2 font-bold" onClick={handleSubmit} disabled={submitCodeMutation.isPending || (!!activeSubmissionId && (submission?.status === "pending" || submission?.status === "running"))}>
            {submitCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col bg-card">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-10">
                <TabsTrigger value="description" className="rounded-none h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary">Description</TabsTrigger>
                <TabsTrigger value="submissions" className="rounded-none h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary">Submissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="flex-1 overflow-auto p-4 prose prose-invert max-w-none mt-0">
                <div dangerouslySetInnerHTML={{ __html: problem.description }} />
                
                {problem.constraints && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold mb-2">Constraints:</h3>
                    <ul className="list-disc pl-5">
                      {problem.constraints.split('\n').map((c, i) => c.trim() && <li key={i}><code className="bg-secondary px-1.5 py-0.5 rounded">{c}</code></li>)}
                    </ul>
                  </div>
                )}
                
                {problem.hints && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold mb-2">Hints:</h3>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {problem.hints.split('\n').map((h, i) => h.trim() && <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="submissions" className="flex-1 overflow-auto p-4 mt-0">
                <p className="text-muted-foreground text-sm">View your submission history in the Submissions tab on the top nav.</p>
                <Link href="/submissions">
                  <Button variant="outline" className="mt-4">Go to Submissions</Button>
                </Link>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70}>
              <div className="h-full border-b border-border relative">
                <Editor
                  height="100%"
                  language={language === "c" || language === "cpp" ? "cpp" : language === "rust" ? "rust" : language}
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "Space Mono, monospace",
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                  }}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={30} minSize={10}>
              <div className="h-full flex flex-col bg-card">
                <Tabs value={resultTab} onValueChange={setResultTab} className="flex flex-col h-full">
                  <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-10">
                    <TabsTrigger value="testcases" className="rounded-none h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary">Test Cases</TabsTrigger>
                    <TabsTrigger value="run" className="rounded-none h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary">Run Result</TabsTrigger>
                    <TabsTrigger value="submission" className="rounded-none h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary">Submission</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="testcases" className="flex-1 overflow-auto p-4 mt-0">
                    {problem.testCases?.map((tc, i) => !tc.isHidden && (
                      <div key={i} className="mb-4 last:mb-0">
                        <div className="font-bold text-sm mb-2 text-muted-foreground">Case {i + 1}</div>
                        <div className="bg-secondary p-3 rounded-md font-mono text-sm mb-2 whitespace-pre-wrap">
                          <span className="text-muted-foreground">Input:</span><br/>{tc.input}
                        </div>
                        <div className="bg-secondary p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                          <span className="text-muted-foreground">Expected:</span><br/>{tc.expectedOutput}
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="run" className="flex-1 overflow-auto p-4 mt-0">
                    {!runResult ? (
                      <div className="text-muted-foreground text-sm h-full flex items-center justify-center">
                        {runCodeMutation.isPending ? "Running code..." : "Run your code to see results."}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className={`font-bold text-lg ${
                          runResult.status === "accepted" ? "text-green-500" : "text-red-500"
                        }`}>
                          {runResult.status.toUpperCase()}
                        </div>
                        
                        <div className="bg-secondary p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                          <span className="text-muted-foreground block mb-1">Input:</span>
                          {runResult.testCase.input}
                        </div>
                        
                        <div className="bg-secondary p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                          <span className="text-muted-foreground block mb-1">Output:</span>
                          {runResult.output || "(no output)"}
                        </div>

                        {runResult.status !== "accepted" && (
                          <div className="bg-secondary p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                            <span className="text-muted-foreground block mb-1">Expected:</span>
                            {runResult.testCase.expectedOutput}
                          </div>
                        )}

                        {runResult.stderr && (
                          <div className="bg-red-500/10 text-red-500 p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                            <span className="font-bold block mb-1">Error:</span>
                            {runResult.stderr}
                          </div>
                        )}
                        
                        {(runResult.runtime || runResult.memory) && (
                          <div className="flex gap-4 text-sm text-muted-foreground pt-2">
                            {runResult.runtime && <div>Runtime: {runResult.runtime}ms</div>}
                            {runResult.memory && <div>Memory: {runResult.memory}KB</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="submission" className="flex-1 overflow-auto p-4 mt-0">
                    {!activeSubmissionId && !submission ? (
                      <div className="text-muted-foreground text-sm h-full flex items-center justify-center">
                        Submit your code to see results.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                          <div className={`text-2xl font-bold ${
                            submission?.status === "accepted" ? "text-green-500" :
                            submission?.status === "pending" || submission?.status === "running" ? "text-blue-500" :
                            "text-red-500"
                          }`}>
                            {submission?.status === "pending" || submission?.status === "running" ? "Evaluating..." :
                             submission?.status === "accepted" ? "Accepted" :
                             submission?.status === "wrong_answer" ? "Wrong Answer" :
                             submission?.status === "time_limit_exceeded" ? "Time Limit Exceeded" :
                             submission?.status === "runtime_error" ? "Runtime Error" :
                             submission?.status === "compilation_error" ? "Compilation Error" :
                             submission?.status}
                          </div>
                          {(submission?.status === "pending" || submission?.status === "running") && (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          )}
                        </div>

                        {submission?.errorMessage && (
                          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-md font-mono text-sm text-red-400 whitespace-pre-wrap overflow-auto">
                            {submission.errorMessage}
                          </div>
                        )}

                        {submission?.status === "accepted" && (
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-secondary/30 border-border">
                              <CardContent className="p-4">
                                <div className="text-sm text-muted-foreground mb-1">Runtime</div>
                                <div className="text-xl font-bold font-mono">{submission.runtime} <span className="text-sm font-normal text-muted-foreground">ms</span></div>
                              </CardContent>
                            </Card>
                            <Card className="bg-secondary/30 border-border">
                              <CardContent className="p-4">
                                <div className="text-sm text-muted-foreground mb-1">Memory</div>
                                <div className="text-xl font-bold font-mono">{submission.memory} <span className="text-sm font-normal text-muted-foreground">KB</span></div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        
                        {submission?.output && submission.status !== "accepted" && (
                          <div className="bg-secondary p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                            <span className="text-muted-foreground block mb-1">Last Output:</span>
                            {submission.output}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
