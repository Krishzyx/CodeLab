import { useState } from "react";
import { 
  useListProblems, getListProblemsQueryKey,
  useCreateProblem, useUpdateProblem, useDeleteProblem
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ShieldAlert } from "lucide-react";

const testCaseSchema = z.object({
  input: z.string().min(1, "Input is required"),
  expectedOutput: z.string().min(1, "Expected output is required"),
  isHidden: z.boolean().default(false),
});

const problemSchema = z.object({
  title: z.string().min(3),
  difficulty: z.enum(["easy", "medium", "hard"]),
  description: z.string().min(10),
  constraints: z.string().optional(),
  hints: z.string().optional(),
  tags: z.string(), // We'll split this by comma
  starterCode: z.string().optional(),
  testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
});

type FormValues = z.infer<typeof problemSchema>;

export default function AdminProblems() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListProblems({ page, limit: 50 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMutation = useCreateProblem();
  const updateMutation = useUpdateProblem();
  const deleteMutation = useDeleteProblem();

  const form = useForm<FormValues>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      difficulty: "medium",
      description: "",
      constraints: "",
      hints: "",
      tags: "",
      starterCode: "",
      testCases: [{ input: "", expectedOutput: "", isHidden: false }]
    }
  });

  const openCreateDialog = () => {
    setEditingProblem(null);
    form.reset({
      title: "",
      difficulty: "medium",
      description: "",
      constraints: "",
      hints: "",
      tags: "",
      starterCode: "",
      testCases: [{ input: "", expectedOutput: "", isHidden: false }]
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (problem: any) => {
    setEditingProblem(problem);
    form.reset({
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      constraints: problem.constraints || "",
      hints: problem.hints || "",
      tags: problem.tags?.join(", ") || "",
      starterCode: problem.starterCode || "",
      testCases: problem.testCases?.length ? problem.testCases : [{ input: "", expectedOutput: "", isHidden: false }]
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      tags: values.tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    if (editingProblem) {
      updateMutation.mutate({ id: editingProblem.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Problem updated." });
          queryClient.invalidateQueries({ queryKey: getListProblemsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" })
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Problem created." });
          queryClient.invalidateQueries({ queryKey: getListProblemsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" })
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this problem?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Problem deleted." });
          queryClient.invalidateQueries({ queryKey: getListProblemsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" })
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Manage Problems</h1>
            <p className="text-muted-foreground text-sm">Admin dashboard</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2"><Plus className="w-4 h-4" /> New Problem</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProblem ? "Edit Problem" : "Create Problem"}</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="difficulty" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description (HTML/Markdown)</FormLabel><FormControl><Textarea className="min-h-[150px] font-mono" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="constraints" render={({ field }) => (
                    <FormItem><FormLabel>Constraints (one per line)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="hints" render={({ field }) => (
                    <FormItem><FormLabel>Hints (one per line)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="tags" render={({ field }) => (
                  <FormItem><FormLabel>Tags (comma separated)</FormLabel><FormControl><Input placeholder="arrays, dp, graphs" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="starterCode" render={({ field }) => (
                  <FormItem><FormLabel>Starter Code</FormLabel><FormControl><Textarea className="font-mono min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className="border border-border p-4 rounded-md bg-secondary/20">
                  <h3 className="font-bold mb-4">Test Cases</h3>
                  {form.watch("testCases").map((tc, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
                      <FormField control={form.control} name={`testCases.${index}.input`} render={({ field }) => (
                        <FormItem><FormLabel>Input</FormLabel><FormControl><Textarea className="font-mono h-20" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`testCases.${index}.expectedOutput`} render={({ field }) => (
                        <FormItem><FormLabel>Expected Output</FormLabel><FormControl><Textarea className="font-mono h-20" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const current = form.getValues("testCases");
                    form.setValue("testCases", [...current, { input: "", expectedOutput: "", isHidden: false }]);
                  }}>Add Test Case</Button>
                </div>
                
                <Button type="submit" className="w-full font-bold" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProblem ? "Save Changes" : "Create Problem"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Difficulty</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading problems...</td></tr>
            ) : data?.problems.map((problem) => (
              <tr key={problem.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{problem.id}</td>
                <td className="px-4 py-3 font-medium">{problem.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-sm ${
                    problem.difficulty === 'easy' ? 'bg-green-500/10 text-green-500' :
                    problem.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {problem.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(problem)}>
                      <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(problem.id)}>
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
