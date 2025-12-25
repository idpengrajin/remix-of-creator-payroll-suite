import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Clock } from "lucide-react";
import { MonthlyTargetCard } from "@/components/dashboard/MonthlyTargetCard";

export default function Dashboard() {
  const { user, userRole, currentAgency } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats", user?.id, userRole, currentAgency?.id],
    queryFn: async () => {
      if (!user || !currentAgency) return null;

      if (userRole === "CREATOR") {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];

        const [salesData, monthlySalesData, sessionsData, payoutsData, commissionRulesRes, profileData] = await Promise.all([
          supabase
            .from("penjualan_harian")
            .select("gmv, commission_gross")
            .eq("user_id", user.id),
          // Monthly sales for target progress
          supabase
            .from("penjualan_harian")
            .select("gmv, commission_gross")
            .eq("user_id", user.id)
            .gte("date", startDate)
            .lte("date", endDate),
          supabase
            .from("sesi_live")
            .select("duration_minutes")
            .eq("user_id", user.id),
          supabase
            .from("payouts")
            .select("total_payout")
            .eq("user_id", user.id)
            .eq("status", "PAID"),
          supabase.from("aturan_komisi").select("*").maybeSingle(),
          supabase
            .from("profiles")
            .select("target_gmv")
            .eq("id", user.id)
            .single(),
        ]);

        const totalGMV = salesData.data?.reduce((acc, curr) => acc + Number(curr.gmv), 0) || 0;
        const totalCommission = salesData.data?.reduce((acc, curr) => acc + Number(curr.commission_gross), 0) || 0;
        const monthlyGMV = monthlySalesData.data?.reduce((acc, curr) => acc + Number(curr.gmv), 0) || 0;
        const monthlyCommission = monthlySalesData.data?.reduce((acc, curr) => acc + Number(curr.commission_gross), 0) || 0;
        const totalMinutes = sessionsData.data?.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) || 0;
        const totalPayout = payoutsData.data?.reduce((acc, curr) => acc + Number(curr.total_payout), 0) || 0;
        const targetGMV = profileData.data?.target_gmv || 0;

        // Calculate estimated bonus based on monthly GMV
        let estimatedBonus = 0;
        if (commissionRulesRes.data?.slabs && monthlyGMV > 0) {
          const slabs = commissionRulesRes.data.slabs as any[];
          const sortedSlabs = [...slabs].sort((a, b) => b.min - a.min);
          const targetSlab = sortedSlabs.find(slab => monthlyGMV >= slab.min);
          if (targetSlab) {
            estimatedBonus = Math.round(monthlyCommission * targetSlab.rate);
          }
        }

        return {
          totalGMV,
          totalCommission,
          totalMinutes,
          totalPayout,
          estimatedBonus,
          monthlyGMV,
          monthlyCommission,
          targetGMV,
        };
      }

      if (userRole === "ADMIN" || userRole === "INVESTOR" || userRole === "AGENCY_OWNER") {
        const [salesData, creatorsData, payoutsData] = await Promise.all([
          supabase.from("penjualan_harian").select("gmv, commission_gross").eq("agency_id", currentAgency.id),
          supabase.from("profiles").select("id").eq("role", "CREATOR").eq("status", "ACTIVE").eq("agency_id", currentAgency.id),
          supabase.from("payouts").select("total_payout").eq("status", "PAID").eq("agency_id", currentAgency.id),
        ]);

        const totalGMV = salesData.data?.reduce((acc, curr) => acc + Number(curr.gmv), 0) || 0;
        const totalCommission = salesData.data?.reduce((acc, curr) => acc + Number(curr.commission_gross), 0) || 0;
        const totalCreators = creatorsData.data?.length || 0;
        const totalPayout = payoutsData.data?.reduce((acc, curr) => acc + Number(curr.total_payout), 0) || 0;

        return {
          totalGMV,
          totalCommission,
          totalCreators,
          totalPayout,
        };
      }

      return null;
    },
    enabled: !!user && !!userRole && !!currentAgency,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang kembali! Ini adalah ringkasan performa Anda.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {userRole === "CREATOR" && (
          <>
            {/* Monthly Target Card - Prominent Position */}
            <MonthlyTargetCard 
              currentGMV={stats?.monthlyGMV || 0} 
              targetGMV={stats?.targetGMV || 0} 
            />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.monthlyGMV || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">GMV bulan ini</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Komisi</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.monthlyCommission || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Komisi bulan ini</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jam Live</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round((stats?.totalMinutes || 0) / 60)} jam</div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.totalMinutes || 0} menit total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gaji</CardTitle>
                <DollarSign className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(stats?.totalPayout || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gaji yang sudah dibayar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimasi Bonus Saat Ini</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(stats?.estimatedBonus || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Berdasarkan GMV saat ini</p>
              </CardContent>
            </Card>
          </>
        )}

        {(userRole === "ADMIN" || userRole === "INVESTOR" || userRole === "AGENCY_OWNER") && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalGMV || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Seluruh kreator</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Komisi</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalCommission || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Komisi kotor total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jumlah Kreator</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCreators || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Kreator aktif</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(stats?.totalPayout || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gaji yang dibayar</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}