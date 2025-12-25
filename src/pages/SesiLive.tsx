import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SesiLive() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [shift, setShift] = useState<"PAGI" | "SIANG" | "MALAM">("PAGI");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState<string>("0:00:00");

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const { data: sessions = [] } = useQuery({
    queryKey: ["sesi-live", user?.id, userRole],
    queryFn: async () => {
      let query = supabase
        .from("sesi_live")
        .select("*, profiles(name)")
        .order("check_in", { ascending: false });

      // If creator, only show their own sessions
      if (userRole === "CREATOR") {
        query = query.eq("user_id", user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  // Update live duration every second
  useEffect(() => {
    if (!activeSession) {
      setLiveDuration("0:00:00");
      return;
    }

    const session = sessions.find((s) => s.id === activeSession);
    if (!session) return;

    const updateDuration = () => {
      const checkIn = new Date(session.check_in);
      const now = new Date();
      const diffMs = now.getTime() - checkIn.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;
      
      setLiveDuration(
        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    // Update immediately
    updateDuration();

    // Then update every second
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [activeSession, sessions]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (activeSession) {
        toast.error("Anda sudah memiliki sesi live yang aktif.");
        throw new Error("Active session exists");
      }

      const now = new Date();
      const { data, error } = await supabase
        .from("sesi_live")
        .insert({
          user_id: user!.id,
          date: format(now, "yyyy-MM-dd"),
          shift,
          check_in: now.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveSession(data.id);
      queryClient.invalidateQueries({ queryKey: ["sesi-live"] });
      toast.success("Clock in berhasil!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("Tidak ada sesi aktif");
      
      const now = new Date();
      const session = sessions.find((s) => s.id === activeSession);
      if (!session) throw new Error("Sesi tidak ditemukan");

      const checkIn = new Date(session.check_in);
      const durationMinutes = Math.round((now.getTime() - checkIn.getTime()) / 60000);

      const { error } = await supabase
        .from("sesi_live")
        .update({
          check_out: now.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq("id", activeSession);

      if (error) throw error;
    },
    onSuccess: () => {
      setActiveSession(null);
      queryClient.invalidateQueries({ queryKey: ["sesi-live"] });
      toast.success("Clock out berhasil!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Check if there's an active session
  useEffect(() => {
    const active = sessions.find((s) => !s.check_out);
    if (active) {
      setActiveSession(active.id);
    }
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sesi Live</h1>
        <p className="text-muted-foreground mt-1">
          {userRole === "ADMIN"
            ? "Lihat semua laporan sesi live dari kreator"
            : "Catat jam kerja live Anda dengan clock in dan clock out"
          }
        </p>
      </div>

      {userRole === "CREATOR" && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Clock In / Out</CardTitle>
            <CardDescription>
              {activeSession ? "Anda sedang live. Klik Clock Out untuk mengakhiri sesi." : "Pilih shift dan klik Clock In untuk memulai."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeSession ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift</label>
                  <Select value={shift} onValueChange={(v) => setShift(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAGI">Pagi</SelectItem>
                      <SelectItem value="SIANG">Siang/Sore</SelectItem>
                      <SelectItem value="MALAM">Malam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-success">
                    <Clock className="h-5 w-5 animate-pulse" />
                    <span className="font-medium">Anda sedang live...</span>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold tabular-nums tracking-tight">
                      {liveDuration}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Durasi Live</p>
                  </div>
                </div>
                <Button
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  className="w-full"
                  variant="destructive"
                  size="lg"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Histori Sesi Live</CardTitle>
          <CardDescription>Riwayat sesi live Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {userRole === "ADMIN" && <TableHead>Kreator</TableHead>}
                <TableHead>Tanggal</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Durasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  {userRole === "ADMIN" && (
                    <TableCell className="font-medium">
                      {session.profiles?.name || "Unknown"}
                    </TableCell>
                  )}
                  <TableCell>{session.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {session.shift === "PAGI" ? "Pagi" : session.shift === "SIANG" ? "Siang/Sore" : "Malam"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(session.check_in), "HH:mm")}</TableCell>
                  <TableCell>
                    {session.check_out ? (
                      format(new Date(session.check_out), "HH:mm")
                    ) : (
                      <Badge variant="default" className="bg-success">Live</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {session.duration_minutes ? formatDuration(session.duration_minutes) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={userRole === "ADMIN" ? 6 : 5} className="text-center text-muted-foreground">
                    Belum ada sesi live
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
