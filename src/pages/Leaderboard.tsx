import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateRangeFilter from "@/components/sales/DateRangeFilter";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

interface LeaderboardData {
  user_id: string;
  name: string;
  total_gmv: number;
  total_minutes: number;
  total_posts: number;
}

export default function Leaderboard() {
  const [filterType, setFilterType] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getDateRange = () => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (filterType) {
      case "daily":
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case "weekly":
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "monthly":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "custom":
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
        } else {
          start = startOfMonth(today);
          end = endOfMonth(today);
        }
        break;
      default:
        start = startOfMonth(today);
        end = endOfMonth(today);
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const dateRange = getDateRange();

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["leaderboard", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard_data", {
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      if (error) throw error;
      return data as LeaderboardData[];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} jam ${mins} menit`;
  };

  const topGMV = useMemo(() => {
    if (!leaderboardData) return [];
    return [...leaderboardData]
      .sort((a, b) => Number(b.total_gmv) - Number(a.total_gmv))
      .slice(0, 10);
  }, [leaderboardData]);

  const topMinutes = useMemo(() => {
    if (!leaderboardData) return [];
    return [...leaderboardData]
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10);
  }, [leaderboardData]);

  const topPosts = useMemo(() => {
    if (!leaderboardData) return [];
    return [...leaderboardData]
      .sort((a, b) => Number(b.total_posts) - Number(a.total_posts))
      .slice(0, 10);
  }, [leaderboardData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">Peringkat performa kreator</p>
      </div>

      <DateRangeFilter
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApplyFilter={() => {}}
      />

      <Tabs defaultValue="gmv" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gmv">Top GMV</TabsTrigger>
          <TabsTrigger value="hours">Top Jam Live</TabsTrigger>
          <TabsTrigger value="content">Top Konten</TabsTrigger>
        </TabsList>

        <TabsContent value="gmv">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Top 10 Kreator - GMV Tertinggi</CardTitle>
              <CardDescription>Berdasarkan total GMV pada periode terpilih</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : topGMV.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada data pada periode ini.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Peringkat</TableHead>
                      <TableHead>Nama Kreator</TableHead>
                      <TableHead className="text-right">Total GMV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topGMV.map((creator, index) => (
                      <TableRow key={creator.user_id}>
                        <TableCell className="font-bold text-lg">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{creator.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(creator.total_gmv))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Top 10 Kreator - Jam Live Terbanyak</CardTitle>
              <CardDescription>Berdasarkan total durasi sesi live pada periode terpilih</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : topMinutes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada data pada periode ini.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Peringkat</TableHead>
                      <TableHead>Nama Kreator</TableHead>
                      <TableHead className="text-right">Total Jam Live</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMinutes.map((creator, index) => (
                      <TableRow key={creator.user_id}>
                        <TableCell className="font-bold text-lg">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{creator.name}</TableCell>
                        <TableCell className="text-right">{formatDuration(creator.total_minutes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Top 10 Kreator - Konten Terbanyak</CardTitle>
              <CardDescription>Berdasarkan jumlah postingan pada periode terpilih</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : topPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada data pada periode ini.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Peringkat</TableHead>
                      <TableHead>Nama Kreator</TableHead>
                      <TableHead className="text-right">Jumlah Postingan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPosts.map((creator, index) => (
                      <TableRow key={creator.user_id}>
                        <TableCell className="font-bold text-lg">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{creator.name}</TableCell>
                        <TableCell className="text-right">{creator.total_posts}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
