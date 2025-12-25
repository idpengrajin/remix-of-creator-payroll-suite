import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ContentLog {
  id: string;
  date: string;
  link: string;
  post_number: number;
  is_counted: boolean;
  user_id: string;
  profiles?: {
    name: string;
  };
}

export default function Konten() {
  const [contentLogs, setContentLogs] = useState<ContentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    link: "",
    post_number: "",
    is_counted: true
  });
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (user) {
      fetchContentLogs();
    }
  }, [user]);

  const fetchContentLogs = async () => {
    try {
      let query = supabase
        .from("content_logs")
        .select("*, profiles(name)")
        .order("date", { ascending: false });

      // If creator, only show their own logs
      if (userRole === "CREATOR") {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContentLogs(data as any || []);
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from("content_logs")
        .insert({
          user_id: user.id,
          date: formData.date,
          link: formData.link,
          post_number: parseInt(formData.post_number),
          is_counted: formData.is_counted
        });

      if (error) throw error;

      toast.success("Log konten berhasil ditambahkan");

      setDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        link: "",
        post_number: "",
        is_counted: true
      });
      fetchContentLogs();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Konten</h1>
        <p className="text-muted-foreground mt-1">
          {userRole === "ADMIN" 
            ? "Lihat semua laporan konten dari kreator"
            : "Catat postingan konten Anda untuk tracking performa"
          }
        </p>
      </div>

      {userRole === "CREATOR" && (
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tambah Log Konten</CardTitle>
                <CardDescription>Catat link postingan konten Anda</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Log Konten
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Log Konten</DialogTitle>
                    <DialogDescription>
                      Masukkan detail postingan konten Anda
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Tanggal</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link">Link Postingan</Label>
                      <Input
                        id="link"
                        type="url"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        placeholder="https://tiktok.com/@username/video/..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="post_number">Nomor Postingan</Label>
                      <Input
                        id="post_number"
                        type="number"
                        value={formData.post_number}
                        onChange={(e) => setFormData({ ...formData, post_number: e.target.value })}
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_counted"
                        checked={formData.is_counted}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, is_counted: checked as boolean })
                        }
                      />
                      <Label htmlFor="is_counted" className="cursor-pointer">
                        Hitung dalam perhitungan payroll
                      </Label>
                    </div>
                    <Button type="submit" className="w-full">Simpan</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Histori Konten</CardTitle>
          <CardDescription>Riwayat postingan konten Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : contentLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada log konten. Mulai catat postingan Anda!
            </p>
          ) : (
             <Table>
              <TableHeader>
                <TableRow>
                  {userRole === "ADMIN" && <TableHead>Kreator</TableHead>}
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nomor Post</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentLogs.map((log) => (
                  <TableRow key={log.id}>
                    {userRole === "ADMIN" && (
                      <TableCell className="font-medium">
                        {log.profiles?.name || "Unknown"}
                      </TableCell>
                    )}
                    <TableCell>{formatDate(log.date)}</TableCell>
                    <TableCell>#{log.post_number}</TableCell>
                    <TableCell>
                      <a 
                        href={log.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Lihat Post
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className={log.is_counted ? "text-green-600" : "text-muted-foreground"}>
                        {log.is_counted ? "Dihitung" : "Tidak dihitung"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
