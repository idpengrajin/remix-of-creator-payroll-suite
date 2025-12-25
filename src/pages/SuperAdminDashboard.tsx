import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Building2, Users, TrendingUp, Crown, Ban, CheckCircle, LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";

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
}

export default function SuperAdminDashboard() {
  const { isSuperAdmin, loading, signOut, currentAgency } = useAuth();
  const queryClient = useQueryClient();

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ["super-admin-agencies"],
    queryFn: async () => {
      const { data: agenciesData, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts for each agency
      const agenciesWithCounts = await Promise.all(
        (agenciesData || []).map(async (agency) => {
          const { count } = await supabase
            .from("agency_members")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", agency.id);
          
          return {
            ...agency,
            member_count: count || 0,
          };
        })
      );

      return agenciesWithCounts as Agency[];
    },
    enabled: isSuperAdmin,
  });

  const { data: stats } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const [agencyCount, userCount, activeCount] = await Promise.all([
        supabase.from("agencies").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("agencies")
          .select("*", { count: "exact", head: true })
          .eq("subscription_status", "ACTIVE"),
      ]);

      return {
        totalAgencies: agencyCount.count || 0,
        totalUsers: userCount.count || 0,
        activeAgencies: activeCount.count || 0,
      };
    },
    enabled: isSuperAdmin,
  });

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
      toast.success("Agensi berhasil diupdate");
    },
    onError: (error: any) => {
      toast.error("Gagal mengupdate agensi: " + error.message);
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

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "FREE":
        return <Badge variant="outline">Free</Badge>;
      case "PRO":
        return <Badge className="bg-blue-500">Pro</Badge>;
      case "ENTERPRISE":
        return <Badge className="bg-purple-500">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Kelola semua agensi platform</p>
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
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agensi</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAgencies || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agensi Aktif</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeAgencies || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total User</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Agencies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Agensi</CardTitle>
            <CardDescription>Kelola semua agensi yang terdaftar di platform</CardDescription>
          </CardHeader>
          <CardContent>
            {agenciesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Agensi</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Limit Kreator</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies?.map((agency) => (
                    <TableRow key={agency.id}>
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell className="text-muted-foreground">{agency.slug}</TableCell>
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
                      <TableCell>
                        <Select
                          value={agency.subscription_status}
                          onValueChange={(value) => handleStatusChange(agency.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Aktif</SelectItem>
                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                            <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{agency.member_count}</TableCell>
                      <TableCell>{agency.max_creators}</TableCell>
                      <TableCell>
                        {agency.subscription_status === "ACTIVE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(agency.id, "SUSPENDED")}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(agency.id, "ACTIVE")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aktifkan
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}