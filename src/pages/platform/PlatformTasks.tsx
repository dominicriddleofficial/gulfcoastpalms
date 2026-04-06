import { useState, useEffect, useCallback } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, ClipboardList, Calendar, CheckCircle2, Circle, AlertCircle, Clock,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PlatformTask {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  completed_at: string | null;
  created_at: string;
}

const TASK_STATUSES = [
  { value: "todo", label: "To Do", icon: Circle, color: "#6b7280" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "#f59e0b" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "#22c55e" },
];

export default function PlatformTasks() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const [tasks, setTasks] = useState<PlatformTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("platform_tasks").select("*").order("created_at", { ascending: false });
    if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
    const { data } = await q;
    setTasks((data as PlatformTask[]) || []);
    setLoading(false);
  }, [selectedBusinessId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    await supabase.from("platform_tasks").update(updates).eq("id", id);
    fetchTasks();
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Tasks</h1>
            <p className="font-body text-xs text-muted-foreground">
              {tasks.filter(t => t.status !== "done").length} open · {tasks.filter(t => t.status === "done").length} completed
            </p>
          </div>
          <Button size="sm" className="font-body text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Task
          </Button>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[{ value: "all", label: "All" }, ...TASK_STATUSES].map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-body font-medium border transition-all",
                statusFilter === s.value
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-secondary text-muted-foreground border-border"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const st = TASK_STATUSES.find(s => s.value === task.status) || TASK_STATUSES[0];
              const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "done";
              const dueToday = task.due_date && isToday(new Date(task.due_date));
              return (
                <div key={task.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                  <button
                    onClick={() => updateStatus(task.id, task.status === "done" ? "todo" : "done")}
                    className="mt-0.5 shrink-0"
                  >
                    <st.icon className="w-5 h-5" style={{ color: st.color }} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-body text-sm text-foreground",
                      task.status === "done" && "line-through text-muted-foreground"
                    )}>{task.title}</p>
                    {task.description && (
                      <p className="font-body text-[11px] text-muted-foreground mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {task.due_date && (
                        <span className={cn(
                          "font-body text-[10px] flex items-center gap-1",
                          overdue ? "text-destructive" : dueToday ? "text-primary" : "text-muted-foreground"
                        )}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                      {task.priority !== "normal" && (
                        <span className={cn(
                          "text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full",
                          task.priority === "urgent" ? "bg-destructive/20 text-destructive" :
                          task.priority === "high" ? "bg-yellow-500/20 text-yellow-600" : "bg-secondary text-muted-foreground"
                        )}>{task.priority}</span>
                      )}
                    </div>
                  </div>
                  <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v)}>
                    <SelectTrigger className="w-auto h-7 px-2 bg-secondary border-border text-[10px] font-body">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg">
          <CreateTaskForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onCreated={() => { setShowCreate(false); fetchTasks(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function CreateTaskForm({ businesses, selectedBusinessId, onCreated }: {
  businesses: any[]; selectedBusinessId: string | null; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bizId, setBizId] = useState(selectedBusinessId || businesses[0]?.id || "");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!title || !bizId) return;
    setSaving(true);
    const { error } = await supabase.from("platform_tasks").insert({
      business_id: bizId,
      title,
      description: description || null,
      priority,
      due_date: dueDate || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Task created" }); onCreated(); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground">New Task</SheetTitle>
      </SheetHeader>
      {businesses.length > 1 && !selectedBusinessId && (
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Business</label>
          <Select value={bizId} onValueChange={setBizId}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Title *</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-card border-border" />
      </div>
      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Description</label>
        <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-card border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-card border-border text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Due Date</label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-card border-border" />
        </div>
      </div>
      <Button className="w-full" onClick={submit} disabled={saving || !title}>
        {saving ? "Creating..." : "Create Task"}
      </Button>
    </div>
  );
}
