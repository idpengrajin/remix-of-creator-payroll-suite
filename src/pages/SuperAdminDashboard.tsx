import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Crown, 
  Ban, 
  CheckCircle, 
  LogOut, 
  LayoutDashboard, 
  Search, 
  Trash2, 
  Key, 
  Eye, 
  UserCog, 
  DollarSign,
  TrendingDown,
  UserX
} from "lucide-react";
import { toast } from "sonner";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";

interface Agency {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  max_creators: number;
  created_at: string;
  owner_id: string | null;
  member_count?: number;
  owner_email?: string;
  owner_name?: string;
}

interface GlobalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  agency_id: string | null;
  agency_name?: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { isSuperAdmin, loading, signOut, currentAgency, startImpersonation } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false,
    userId: "",
    userName: "",
  });
  const [newPassword, setNewPassword] = useState("");

  // Fetch agencies with owner info
  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ["super-admin-agencies"],
    queryFn: async () => {
      const { data: agenciesData, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts and owner info for each agency
      const agenciesWithDetails = await Promise.all(
        (agenciesData || []).map(async (agency) => {
          const [memberResult, ownerResult] = await Promise.all([
            supabase
              .from("agency_members")
              .select("*", { count: "exact", head: true })
              .eq("agency_id", agency.id),
            agency.owner_id 
              ? supabase
                  .from("profiles")
                  .select("name, email")
                  .eq("id", agency.owner_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...agency,
            member_count: memberResult.count || 0,
            owner_name: ownerResult.data?.name || "N/A",
            owner_email: ownerResult.data?.email || "N/A",
          };
        })
      );

      return agenciesWithDetails as Agency[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch stats with SaaS metrics
  const { data: stats } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [agencyCount, userCount, activeCount, proCount, enterpriseCount, cancelledThisMonth] = await Promise.all([
        supabase.from("agencies").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("agencies").select("*", { count: "exact", head: true }).eq("subscription_status", "ACTIVE"),
        supabase.from("agencies").select("*", { count: "exact", head: true }).eq("subscription_plan", "PRO").eq("subscription_status", "ACTIVE"),
        supabase.from("agencies").select("*", { count: "exact", head: true }).eq("subscription_plan", "ENTERPRISE").eq("subscription_status", "ACTIVE"),
        supabase.from("agencies").select("*", { count: "exact", head: true }).eq("subscription_status", "CANCELLED").gte("updated_at", startOfMonth.toISOString()),
      ]);

      // Calculate MRR (example pricing: Pro = 500k, Enterprise = 2M)
      const proPrice = 500000;
      const enterprisePrice = 2000000;
      const mrr = ((proCount.count || 0) * proPrice) + ((enterpriseCount.count || 0) * enterprisePrice);
      
      // Calculate churn rate
      const totalActiveStart = (agencyCount.count || 0);
      const churnRate = totalActiveStart > 0 ? ((cancelledThisMonth.count || 0) / totalActiveStart) * 100 : 0;

      return {
        totalAgencies: agencyCount.count || 0,
        totalUsers: userCount.count || 0,
        activeAgencies: activeCount.count || 0,
        proAgencies: proCount.count || 0,
        enterpriseAgencies: enterpriseCount.count || 0,
        mrr,
        churnRate: churnRate.toFixed(1),
        cancelledThisMonth: cancelledThisMonth.count || 0,
      };
    },
    enabled: isSuperAdmin,
  });

  // Search users globally
  const { data: searchedUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["super-admin-user-search", userSearchQuery],
    queryFn: async () => {
      if (!userSearchQuery || userSearchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, role, status, agency_id, created_at")
        .or(`email.ilike.%${userSearchQuery}%,name.ilike.%${userSearchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get agency names for users
      const usersWithAgency = await Promise.all(
        (data || []).map(async (user) => {
          if (user.agency_id) {
            const { data: agency } = await supabase
              .from("agencies")
              .select("name")
              .eq("id", user.agency_id)
              .single();
            return { ...user, agency_name: agency?.name || "Unknown" };
          }
          return { ...user, agency_name: "Tidak ada agensi" };
        })
      );

      return usersWithAgency as GlobalUser[];
    },
    enabled: isSuperAdmin && userSearchQuery.length >= 2,
  });

  // Update agency mutation
  const updateAgencyMutation = useMutation({
    mutationFn: async ({ agencyId, updates }: { agencyId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("agencies")
        .update(updates)
        .eq("id", agencyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      toast.success("Agensi berhasil diupdate");
    },
    onError: (error: any) => {
      toast.error("Gagal mengupdate agensi: " + error.message);
    },
  });

  // Delete agency mutation (hard delete)
  const deleteAgencyMutation = useMutation({
    mutationFn: async (agencyId: string) => {
      // Delete in order: members -> invitations -> transactions -> agency
      await supabase.from("agency_members").delete().eq("agency_id", agencyId);
      await supabase.from("agency_invitations").delete().eq("agency_id", agencyId);
      await supabase.from("penjualan_harian").delete().eq("agency_id", agencyId);
      await supabase.from("sesi_live").delete().eq("agency_id", agencyId);
      await supabase.from("content_logs").delete().eq("agency_id", agencyId);
      await supabase.from("payouts").delete().eq("agency_id", agencyId);
      await supabase.from("inventory_items").delete().eq("agency_id", agencyId);
      await supabase.from("investor_ledger").delete().eq("agency_id", agencyId);
      await supabase.from("aturan_komisi").delete().eq("agency_id", agencyId);
      await supabase.from("aturan_payroll").delete().eq("agency_id", agencyId);
      
      // Update profiles to remove agency_id reference
      await supabase.from("profiles").update({ agency_id: null }).eq("agency_id", agencyId);
      
      // Finally delete agency
      const { error } = await supabase.from("agencies").delete().eq("id", agencyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      toast.success("Agensi berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error("Gagal menghapus agensi: " + error.message);
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ userId, newPassword }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Password berhasil direset");
      setResetPasswordDialog({ open: false, userId: "", userName: "" });
      setNewPassword("");
    },
    onError: (error: any) => {
      toast.error("Gagal reset password: " + error.message);
    },
  });

  const handleStatusChange = (agencyId: string, status: string) => {
    updateAgencyMutation.mutate({
      agencyId,
      updates: { subscription_status: status as any },
    });
  };

  const handlePlanChange = (agencyId: string, plan: string) => {
    const maxCreators = plan === "FREE" ? 5 : plan === "PRO" ? 25 : 1000;
    updateAgencyMutation.mutate({
      agencyId,
      updates: { 
        subscription_plan: plan as any,
        max_creators: maxCreators,
      },
    });
  };

  const handleImpersonate = (agencyId: string, agencyName: string) => {
    startImpersonation(agencyId, agencyName);
    toast.success(`Masuk sebagai owner ${agencyName}`);
    navigate("/");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Aktif</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Aktif</Badge>;
      case "PAUSED":
        return <Badge variant="secondary">Paused</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline">Archived</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="destructive">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Super Admin Command Center</h1>
                <p className="text-sm text-muted-foreground">Kelola seluruh platform SaaS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentAgency && (
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Ke Dashboard Agensi
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* SaaS Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.mrr || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.proAgencies || 0} Pro + {stats?.enterpriseAgencies || 0} Enterprise
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agensi Aktif</CardTitle>
              <Building2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeAgencies || 0}</div>
              <p className="text-xs text-muted-foreground">
                dari {stats?.totalAgencies || 0} total agensi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total User</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Semua agensi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.churnRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.cancelledThisMonth || 0} cancelled bulan ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="agencies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agencies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Manajemen Agensi
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Cari User
            </TabsTrigger>
          </TabsList>

          {/* Agencies Tab */}
          <TabsContent value="agencies">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Agensi</CardTitle>
                <CardDescription>Kelola semua agensi termasuk suspend, upgrade, dan hapus</CardDescription>
              </CardHeader>
              <CardContent>
                {agenciesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Agensi</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Tanggal Join</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agencies?.map((agency) => (
                          <TableRow key={agency.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{agency.name}</div>
                                <div className="text-xs text-muted-foreground">{agency.slug}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{agency.owner_name}</div>
                                <div className="text-xs text-muted-foreground">{agency.owner_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={agency.subscription_plan}
                                onValueChange={(value) => handlePlanChange(agency.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="FREE">Free</SelectItem>
                                  <SelectItem value="PRO">Pro</SelectItem>
                                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{getStatusBadge(agency.subscription_status)}</TableCell>
                            <TableCell>{agency.member_count}</TableCell>
                            <TableCell>{format(new Date(agency.created_at), "dd MMM yyyy")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {/* Impersonate Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleImpersonate(agency.id, agency.name)}
                                  title="Login sebagai owner"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                
                                {/* Suspend/Activate Button */}
                                {agency.subscription_status === "ACTIVE" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(agency.id, "SUSPENDED")}
                                    className="text-orange-600 hover:text-orange-700"
                                    title="Suspend agensi"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(agency.id, "ACTIVE")}
                                    className="text-green-600 hover:text-green-700"
                                    title="Aktifkan agensi"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {/* Delete Button */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      title="Hapus agensi"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus Agensi?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Anda akan menghapus <strong>{agency.name}</strong> secara permanen. 
                                        Semua data termasuk member, transaksi, dan konfigurasi akan dihapus. 
                                        Tindakan ini tidak dapat dibatalkan.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAgencyMutation.mutate(agency.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Hapus Permanen
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Cari User Global</CardTitle>
                <CardDescription>Cari user di seluruh agensi berdasarkan email atau nama</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ketik email atau nama user (min. 2 karakter)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : searchedUsers && searchedUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Agensi</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{getUserStatusBadge(user.status)}</TableCell>
                          <TableCell>
                            {user.agency_id ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => {
                                  const agency = agencies?.find(a => a.id === user.agency_id);
                                  if (agency) {
                                    handleImpersonate(agency.id, agency.name);
                                  }
                                }}
                              >
                                {user.agency_name}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetPasswordDialog({
                                  open: true,
                                  userId: user.id,
                                  userName: user.name,
                                })}
                                title="Reset password"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : userSearchQuery.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>User tidak ditemukan</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Ketik minimal 2 karakter untuk mencari</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordDialog({ open: false, userId: "", userName: "" });
          setNewPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set password baru untuk <strong>{resetPasswordDialog.userName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Password baru (min. 6 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setResetPasswordDialog({ open: false, userId: "", userName: "" });
                setNewPassword("");
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate({
                userId: resetPasswordDialog.userId,
                newPassword,
              })}
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Menyimpan..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
