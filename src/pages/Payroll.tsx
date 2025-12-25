import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calculator, Clock, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Payout {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  base_salary: number;
  base_salary_adjusted: number;
  bonus_commission: number;
  deductions: number;
  total_payout: number;
  below_minimum: boolean;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

interface PayrollRules {
  daily_live_target_minutes: number;
  floor_pct: number;
  cap_pct: number;
  minimum_minutes: number;
  workdays: number[];
  holidays: string[];
}

interface CommissionSlab {
  min: number;
  max: number;
  rate: number;
}

interface CommissionRule {
  id: string;
  nama_aturan: string;
  slabs: CommissionSlab[];
}

export default function Payroll() {
  const { userRole } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select(`
          *,
          profiles!payouts_user_id_fkey (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayouts(data as any || []);
    } catch (error: any) {
      toast.error("Gagal memuat data payroll: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    let periodStart: Date;
    let periodEnd: Date;

    if (day >= 30) {
      periodStart = new Date(year, month, 30);
      periodEnd = new Date(year, month + 1, 29);
    } else {
      periodStart = new Date(year, month - 1, 30);
      periodEnd = new Date(year, month, 29);
    }

    return {
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
    };
  };

  const calculateDynamicWorkdays = (startDate: string, endDate: string, workdays: number[], holidays: string[]) => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      
      if (workdays.includes(dayOfWeek) && !holidays.includes(dateStr)) {
        count++;
      }
    }

    return count;
  };

  const calculateCommissionBonus = (totalGmv: number, totalCommission: number, slabs: CommissionSlab[]) => {
    // Calculate average commission rate
    const averageCommissionRate = totalGmv > 0 ? totalCommission / totalGmv : 0;
    
    // Sort slabs by min ascending for progressive calculation
    const sortedSlabs = [...slabs].sort((a, b) => a.min - b.min);
    
    let totalBonus = 0;
    
    // Progressive calculation: calculate bonus for each slab
    for (const slab of sortedSlabs) {
      const gmvInThisSlab = Math.max(0, Math.min(totalGmv, slab.max) - slab.min);
      
      if (gmvInThisSlab > 0) {
        const commissionInThisSlab = gmvInThisSlab * averageCommissionRate;
        const bonusForThisSlab = commissionInThisSlab * slab.rate;
        totalBonus += bonusForThisSlab;
      }
    }
    
    return Math.round(totalBonus);
  };

  const handleCalculatePayroll = async () => {
    setIsCalculating(true);
    setShowCalculateDialog(false);

    try {
      const period = getCurrentPeriod();

      // Check if payroll already exists for this period
      const { data: existingPayouts } = await supabase
        .from("payouts")
        .select("id")
        .eq("period_start", period.start)
        .eq("period_end", period.end);

      if (existingPayouts && existingPayouts.length > 0) {
        toast.error("Payroll untuk periode ini sudah pernah dihitung.");
        setIsCalculating(false);
        return;
      }

      const [payrollRulesRes, allCommissionRulesRes] = await Promise.all([
        supabase.from("aturan_payroll").select("*").maybeSingle(),
        supabase.from("aturan_komisi").select("*"),
      ]);

      if (payrollRulesRes.error) throw payrollRulesRes.error;
      if (allCommissionRulesRes.error) throw allCommissionRulesRes.error;

      if (!payrollRulesRes.data) {
        throw new Error("Aturan payroll belum dikonfigurasi");
      }

      const payrollRules = payrollRulesRes.data as PayrollRules;
      const allCommissionRules = allCommissionRulesRes.data || [];
      
      // Create a map for quick lookup
      const commissionRulesMap = new Map<string, CommissionSlab[]>();
      allCommissionRules.forEach((rule: any) => {
        commissionRulesMap.set(rule.id, rule.slabs as unknown as CommissionSlab[]);
      });

      const dynamicWorkdays = calculateDynamicWorkdays(
        period.start,
        period.end,
        payrollRules.workdays,
        payrollRules.holidays
      );

      const targetMinutesMonthly = payrollRules.daily_live_target_minutes * dynamicWorkdays;

      const { data: creators, error: creatorsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "CREATOR")
        .eq("status", "ACTIVE");

      if (creatorsError) throw creatorsError;

      const monthKey = period.end.substring(0, 7);
      const newPayouts = [];

      for (const creator of creators || []) {
        const { data: sessions, error: sessionsError } = await supabase
          .from("sesi_live")
          .select("duration_minutes")
          .eq("user_id", creator.id)
          .gte("check_in", period.start + "T00:00:00")
          .lte("check_in", period.end + "T23:59:59");

        if (sessionsError) throw sessionsError;

        const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;

        const { data: salesData, error: salesError } = await supabase
          .from("penjualan_harian")
          .select("*")
          .eq("user_id", creator.id)
          .gte("date", period.start)
          .lte("date", period.end);

        if (salesError) throw salesError;
        
        const totalGmv = salesData?.reduce((sum, s) => sum + (s.gmv || 0), 0) || 0;
        const totalCommission = salesData?.reduce((sum, s) => sum + (s.commission_gross || 0), 0) || 0;

        // Calculate base pay based on salary type
        let basePay = 0;
        const baseSalary = creator.base_salary || 0;
        const hourlyRate = (creator as any).hourly_rate || 0;

        if (baseSalary > 0) {
          // Monthly salary (Kreator Afiliasi)
          const achievementRatio = totalMinutes / targetMinutesMonthly;
          const clampedRatio = Math.max(
            payrollRules.floor_pct,
            Math.min(payrollRules.cap_pct, achievementRatio)
          );
          basePay = Math.round(baseSalary * clampedRatio);
        } else if (hourlyRate > 0) {
          // Hourly rate (Host Akun Internal)
          const totalHours = totalMinutes / 60;
          basePay = Math.round(totalHours * hourlyRate);
        }

        // Calculate bonus based on creator's commission rule
        let bonusCommission = 0;
        const creatorCommissionRuleId = (creator as any).id_aturan_komisi;
        
        if (totalGmv > 0 && creatorCommissionRuleId) {
          const creatorSlabs = commissionRulesMap.get(creatorCommissionRuleId) || [];
          if (creatorSlabs.length > 0) {
            bonusCommission = calculateCommissionBonus(
              totalGmv,
              totalCommission,
              creatorSlabs
            );
          }
        }

        const belowMinimum = totalMinutes < payrollRules.minimum_minutes;
        const totalPayout = basePay + bonusCommission;

        newPayouts.push({
          user_id: creator.id,
          period_start: period.start,
          period_end: period.end,
          base_salary: baseSalary > 0 ? baseSalary : hourlyRate,
          base_salary_adjusted: basePay,
          bonus_commission: bonusCommission,
          deductions: 0,
          total_payout: totalPayout,
          below_minimum: belowMinimum,
          status: "DRAFT",
        });
      }

      const { error: insertError } = await supabase
        .from("payouts")
        .insert(newPayouts);

      if (insertError) throw insertError;

      toast.success(`Berhasil menghitung payroll untuk ${newPayouts.length} kreator`);
      fetchPayouts();
    } catch (error: any) {
      toast.error("Gagal menghitung payroll: " + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleUpdateStatus = async (payoutId: string, newStatus: "DRAFT" | "APPROVED" | "PAID") => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: newStatus })
        .eq("id", payoutId);

      if (error) throw error;

      toast.success("Status berhasil diperbarui");
      fetchPayouts();
    } catch (error: any) {
      toast.error("Gagal memperbarui status: " + error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">Draft</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Approved</Badge>;
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const period = getCurrentPeriod();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kelola Payroll</h1>
        <p className="text-muted-foreground mt-1">
          Hitung gaji, kelola status pembayaran kreator.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Periode Aktif</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(period.start)}</div>
            <p className="text-xs text-muted-foreground">
              s/d {formatDate(period.end)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payouts.length}</div>
            <p className="text-xs text-muted-foreground">
              Draft: {payouts.filter(p => p.status === "DRAFT").length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembayaran</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(payouts.reduce((sum, p) => sum + p.total_payout, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Semua status
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perhitungan Payroll</CardTitle>
              <CardDescription>Generate payroll otomatis untuk periode berjalan</CardDescription>
            </div>
            {userRole !== 'INVESTOR' && (
              <Button onClick={() => setShowCalculateDialog(true)} disabled={isCalculating}>
                <Calculator className="h-4 w-4 mr-2" />
                {isCalculating ? "Menghitung..." : "Hitung Payroll"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Belum ada data payroll untuk periode ini
              </p>
              <p className="text-sm text-muted-foreground">
                Klik tombol "Hitung Payroll" untuk memulai perhitungan otomatis
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kreator</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Gaji Adjusted</TableHead>
                    <TableHead>Bonus Komisi</TableHead>
                    <TableHead>Total Payout</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Status</TableHead>
                    {userRole !== 'INVESTOR' && <TableHead>Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payout.profiles.name}</div>
                          <div className="text-sm text-muted-foreground">{payout.profiles.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(payout.base_salary)}</TableCell>
                      <TableCell>
                        <div>
                          <div>{formatCurrency(payout.base_salary_adjusted)}</div>
                          <div className="text-xs text-muted-foreground">
                            {((payout.base_salary_adjusted / payout.base_salary) * 100).toFixed(0)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(payout.bonus_commission)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(payout.total_payout)}</TableCell>
                      <TableCell>
                        {payout.below_minimum && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Below Min
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      {userRole !== 'INVESTOR' && (
                        <TableCell>
                          <Select
                            value={payout.status}
                            onValueChange={(value: "DRAFT" | "APPROVED" | "PAID") => handleUpdateStatus(payout.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="APPROVED">Approved</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hitung Payroll Otomatis?</AlertDialogTitle>
            <AlertDialogDescription>
              Sistem akan menghitung gaji untuk semua kreator aktif berdasarkan:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Total jam live dalam periode {formatDate(period.start)} - {formatDate(period.end)}</li>
                <li>Data sales dan komisi bulan ini</li>
                <li>Aturan payroll dan komisi yang sudah dikonfigurasi</li>
              </ul>
              <p className="mt-3 font-semibold">Status awal: DRAFT</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCalculatePayroll}>
              Ya, Hitung Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
