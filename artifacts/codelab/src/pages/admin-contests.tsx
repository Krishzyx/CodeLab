import { useState } from "react";
import { 
  useListContests, getListContestsQueryKey,
  useCreateContest, useUpdateContest, useDeleteContest
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ShieldAlert } from "lucide-react";

const contestSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  problemIds: z.string().optional(),
});

type FormValues = z.infer<typeof contestSchema>;

export default function AdminContests() {
  const { data: activeData, isLoading: isLoadingActive } = useListContests({ status: "active" });
  const { data: upcomingData, isLoading: isLoadingUpcoming } = useListContests({ status: "upcoming" });
  const { data: endedData, isLoading: isLoadingEnded } = useListContests({ status: "ended" });
  
  const allContests = [
    ...(activeData?.contests || []),
    ...(upcomingData?.contests || []),
    ...(endedData?.contests || [])
  ];
  
  const isLoading = isLoadingActive || isLoadingUpcoming || isLoadingEnded;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContest, setEditingContest] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMutation = useCreateContest();
  const updateMutation = useUpdateContest();
  const deleteMutation = useDeleteContest();

  // Helper to format date for datetime-local input
  const formatForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(contestSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      problemIds: "",
    }
  });

  const openCreateDialog = () => {
    setEditingContest(null);
    form.reset({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      problemIds: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (contest: any) => {
    setEditingContest(contest);
    form.reset({
      title: contest.title,
      description: contest.description,
      startTime: formatForInput(contest.startTime),
      endTime: formatForInput(contest.endTime),
      problemIds: contest.problemIds?.join(",") || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const pIds = values.problemIds?.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const payload = {
      ...values,
      startTime: new Date(values.startTime).toISOString(),
      endTime: new Date(values.endTime).toISOString(),
      problemIds: pIds && pIds.length > 0 ? pIds : undefined,
    };

    if (editingContest) {
      updateMutation.mutate({ id: editingContest.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Contest updated." });
          queryClient.invalidateQueries({ queryKey: getListContestsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" })
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Contest created." });
          queryClient.invalidateQueries({ queryKey: getListContestsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" })
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contest?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Contest deleted." });
          queryClient.invalidateQueries({ queryKey: getListContestsQueryKey() });
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
            <h1 className="text-2xl font-bold">Manage Contests</h1>
            <p className="text-muted-foreground text-sm">Admin dashboard</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2"><Plus className="w-4 h-4" /> New Contest</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContest ? "Edit Contest" : "Create Contest"}</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="problemIds" render={({ field }) => (
                  <FormItem><FormLabel>Problem IDs (comma separated)</FormLabel><FormControl><Input placeholder="1, 4, 15" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <Button type="submit" className="w-full font-bold mt-6" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingContest ? "Save Changes" : "Create Contest"}
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
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Problems</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading contests...</td></tr>
            ) : allContests.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No contests found.</td></tr>
            ) : (
              allContests.map((contest) => (
                <tr key={contest.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{contest.id}</td>
                  <td className="px-4 py-3 font-medium">{contest.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-sm ${
                      contest.status === 'active' ? 'bg-red-500/10 text-red-500' :
                      contest.status === 'upcoming' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {contest.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{contest.problemCount} problems</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(contest)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(contest.id)}>
                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-400" />
                      </Button>
                    </div>
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
