import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, Star, Trophy } from "lucide-react";

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", role: "groundsman", phone: "", email: "" });
  const { toast } = useToast();

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("*").order("name");
    setEmployees(data || []);
    setLoading(false);
  };

  const addEmployee = async () => {
    if (!newEmp.name.trim()) return;
    const { error } = await supabase.from("employees").insert(newEmp);
    if (error) { toast({ title: "Error adding employee", variant: "destructive" }); return; }
    toast({ title: "Employee added" });
    setNewEmp({ name: "", role: "groundsman", phone: "", email: "" });
    setShowAdd(false);
    fetchEmployees();
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Employees</h1>
            <p className="font-body text-sm text-muted-foreground">{employees.length} team members</p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="font-body"><Plus className="w-4 h-4 mr-1" /> Add Employee</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Employee</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="font-body">Name</Label><Input value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} /></div>
                <div>
                  <Label className="font-body">Role</Label>
                  <select value={newEmp.role} onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })} className="w-full px-3 py-2 rounded-md border border-input bg-background font-body text-sm">
                    <option value="team_leader">Team Leader</option>
                    <option value="groundsman">Groundsman</option>
                    <option value="climber">Climber</option>
                  </select>
                </div>
                <div><Label className="font-body">Phone</Label><Input value={newEmp.phone} onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })} /></div>
                <div><Label className="font-body">Email</Label><Input value={newEmp.email} onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} /></div>
                <Button onClick={addEmployee} className="w-full font-body">Add Employee</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">Loading...</p>
        ) : employees.length === 0 ? (
          <p className="text-center text-muted-foreground font-body py-12">No employees yet. Add your first team member above.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-body font-semibold text-lg">{emp.name}</p>
                      <Badge variant="secondary" className="font-body text-xs capitalize">{emp.role.replace("_", " ")}</Badge>
                    </div>
                    <Badge className={emp.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {emp.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Briefcase className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="font-body text-lg font-bold">{emp.jobs_completed || 0}</p>
                      <p className="font-body text-[10px] text-muted-foreground">Jobs</p>
                    </div>
                    <div className="p-2 bg-secondary rounded-lg">
                      <Star className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="font-body text-lg font-bold">{emp.reviews_collected || 0}</p>
                      <p className="font-body text-[10px] text-muted-foreground">Reviews</p>
                    </div>
                    <div className="p-2 bg-secondary rounded-lg">
                      <Trophy className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="font-body text-lg font-bold">{emp.leaderboard_points || 0}</p>
                      <p className="font-body text-[10px] text-muted-foreground">Points</p>
                    </div>
                  </div>
                  {emp.phone && <p className="font-body text-xs text-muted-foreground mt-3">{emp.phone}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
