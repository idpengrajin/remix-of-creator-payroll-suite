import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ResetPasswordDialog } from "@/components/kreator/ResetPasswordDialog";
import { useAuth } from "@/hooks/useAuth";

export default function KreatorDetail() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { userRole } = useAuth();

  // Fetch all creator data in parallel
  const { data, isLoading } = useQuery({
    queryKey: ["creator-detail", creatorId],
    queryFn: async () => {
      const [profileRes, salesRes, sessionsRes, payoutsRes, inventoryRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", creatorId).single(),
        supabase
          .from("penjualan_harian")
          .select("*")
          .eq("user_id", creatorId)
          .order("date", { ascending: false })
          .limit(30),
        supabase
          .from("sesi_live")
          .select("*")
          .eq("user_id", creatorId)
          .order("date", { ascending: false }),
        supabase
          .from("payouts")
          .select("*")
          .eq("user_id", creatorId)
          .order("period_start", { ascending: false }),
        supabase
          .from("inventory_items")
          .select("*")
          .eq("peminjam_id", creatorId)
          .neq("status", "Tersedia"),
      ]);

      if (profileRes.error) throw profileRes.error;
      
      return {
        profile: profileRes.data,
        sales: salesRes.data || [],
        sessions: sessionsRes.data || [],
        payouts: payoutsRes.data || [],
        inventory: inventoryRes.data || [],
      };
    },
    enabled: !!creatorId,
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Prepare chart data (last 30 days)
  const chartData = data?.sales
    .slice(0, 30)
    .reverse()
    .map((sale) => ({
      date: formatDate(sale.date),
      gmv: sale.gmv,
      commission: sale.commission_gross,
    })) || [];

  const chartConfig = {
    gmv: {
      label: "GMV",
      color: "hsl(var(--primary))",
    },
    commission: {
      label: "Komisi",
      color: "hsl(var(--chart-2))",
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Memuat data kreator...</p>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="space-y-4">
        <Link to="/kreator">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <p className="text-center text-muted-foreground">Kreator tidak ditemukan</p>
      </div>
    );
  }

  const { profile, sales, sessions, payouts, inventory } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/kreator">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detail Kreator</h1>
          <p className="text-muted-foreground mt-1">
            Informasi lengkap dan performa {profile.name}
          </p>
        </div>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Informasi Profil</CardTitle>
          {userRole === "ADMIN" && (
            <ResetPasswordDialog userId={creatorId!} userName={profile.name} />
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nama</p>
              <p className="font-medium">{profile.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gaji Pokok</p>
              <p className="font-medium">{formatCurrency(profile.base_salary)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={profile.status === "ACTIVE" ? "default" : "secondary"}>
                {profile.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TikTok</p>
              <p className="font-medium">{profile.tiktok_account || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Niche</p>
              <p className="font-medium">{profile.niche || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bergabung</p>
              <p className="font-medium">{formatDate(profile.join_date)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Grafik Performa Sales (30 Hari Terakhir)
          </CardTitle>
          <CardDescription>
            Visualisasi GMV dan komisi harian
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Belum ada data sales</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="gmv" fill="var(--color-gmv)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commission" fill="var(--color-commission)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Data Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Histori Sales</TabsTrigger>
          <TabsTrigger value="sessions">Histori Sesi Live</TabsTrigger>
          <TabsTrigger value="payouts">Histori Gaji</TabsTrigger>
          <TabsTrigger value="inventory">Inventaris Dipinjam</TabsTrigger>
        </TabsList>

        {/* Sales History */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Histori Sales</CardTitle>
              <CardDescription>Semua transaksi penjualan</CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada data sales</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead className="text-right">GMV</TableHead>
                        <TableHead className="text-right">Komisi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{formatDate(sale.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sale.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.gmv)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.commission_gross)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions History */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Histori Sesi Live</CardTitle>
              <CardDescription>Semua sesi live streaming</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada data sesi live</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead className="text-right">Durasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{formatDate(session.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{session.shift}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(session.check_in).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            {session.check_out
                              ? new Date(session.check_out).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {session.duration_minutes ? formatDuration(session.duration_minutes) : "-"}
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

        {/* Payouts History */}
        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Histori Gaji</CardTitle>
              <CardDescription>Semua pembayaran gaji</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada data gaji</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Gaji Pokok</TableHead>
                        <TableHead className="text-right">Bonus</TableHead>
                        <TableHead className="text-right">Potongan</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payout.status === "PAID"
                                  ? "default"
                                  : payout.status === "DRAFT"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {payout.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payout.base_salary_adjusted)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payout.bonus_commission)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payout.deductions)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payout.total_payout)}
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

        {/* Borrowed Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventaris Dipinjam</CardTitle>
              <CardDescription>Barang yang sedang dipinjam</CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Tidak ada barang yang dipinjam
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nama_barang}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.kategori}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.catatan || "-"}
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
      </Tabs>
    </div>
  );
}
