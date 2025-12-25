import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Copy, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  role: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export default function InvitationManagement() {
  const { currentAgency, agencyRole } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "CREATOR" as "CREATOR" | "ADMIN"
  });

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency) return [];
      
      const { data, error } = await supabase
        .from("agency_invitations")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!currentAgency,
  });

  const { data: creatorCount = 0 } = useQuery({
    queryKey: ["creator-count", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency) return 0;
      
      const { count, error } = await supabase
        .from("agency_members")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", currentAgency.id)
        .eq("role", "CREATOR");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentAgency,
  });

  const canInvite = currentAgency && creatorCount < currentAgency.max_creators;
  const isLimitReached = currentAgency && creatorCount >= currentAgency.max_creators;

  const createInvitationMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      if (!currentAgency) throw new Error("No agency selected");

      // Check creator limit
      if (data.role === "CREATOR" && isLimitReached) {
        throw new Error(`Batas kreator tercapai (${currentAgency.max_creators}). Upgrade paket untuk menambah lebih banyak kreator.`);
      }

      const { data: invitation, error } = await supabase
        .from("agency_invitations")
        .insert([{
          agency_id: currentAgency.id,
          email: data.email || null,
          role: data.role as "ADMIN" | "CREATOR",
        }])
        .select()
        .single();

      if (error) throw error;
      return invitation;
    },
    onSuccess: () => {
      toast.success("Undangan berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setDialogOpen(false);
      setFormData({ email: "", role: "CREATOR" });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("agency_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Undangan berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link undangan berhasil disalin!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitationMutation.mutate(formData);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (agencyRole !== "AGENCY_OWNER" && agencyRole !== "ADMIN") {
    return null;
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Undang Anggota Tim</CardTitle>
            <CardDescription>
              Kirim undangan untuk bergabung ke agensi Anda
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">
                Kreator: {creatorCount} / {currentAgency?.max_creators}
              </div>
              <div className="text-xs text-muted-foreground">
                Paket: {currentAgency?.subscription_plan}
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canInvite && formData.role === "CREATOR"}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Buat Undangan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Undangan Baru</DialogTitle>
                  <DialogDescription>
                    Buat link undangan unik untuk anggota baru
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Opsional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Jika dikosongkan, siapa saja dengan link dapat mendaftar
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "CREATOR" | "ADMIN") => 
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREATOR">Kreator</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.role === "CREATOR" && isLimitReached && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        Batas kreator tercapai. Upgrade paket untuk menambah lebih banyak.
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createInvitationMutation.isPending || (formData.role === "CREATOR" && isLimitReached)}
                  >
                    {createInvitationMutation.isPending ? "Membuat..." : "Buat Undangan"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Memuat...</p>
        ) : invitations.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Belum ada undangan. Klik tombol di atas untuk membuat undangan baru.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kadaluarsa</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      {invitation.email || <span className="text-muted-foreground">Siapa saja</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {invitation.role === "CREATOR" ? "Kreator" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invitation.used_at ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Digunakan
                        </Badge>
                      ) : isExpired(invitation.expires_at) ? (
                        <Badge variant="destructive">Kadaluarsa</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Aktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!invitation.used_at && !isExpired(invitation.expires_at) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invitation.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
