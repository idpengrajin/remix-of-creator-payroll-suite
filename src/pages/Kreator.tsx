import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Pencil, Trash2, UserCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Creator {
  id: string;
  name: string;
  email: string;
  tiktok_account: string | null;
  niche: string | null;
  base_salary: number | null;
  hourly_rate: number | null;
  id_aturan_komisi: string | null;
  join_date: string;
  status: string;
  nama_bank: string | null;
  nomor_rekening: string | null;
  nama_pemilik_rekening: string | null;
  target_gmv: number | null;
}

interface CommissionRule {
  id: string;
  nama_aturan: string;
}

export default function Kreator() {
  const { userRole } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [pendingCreators, setPendingCreators] = useState<Creator[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    tiktok_account: "",
    niche: "",
    base_salary: "",
    hourly_rate: "",
    id_aturan_komisi: "",
    join_date: new Date().toISOString().split('T')[0],
    status: "ACTIVE" as "ACTIVE" | "PAUSED",
    nama_bank: "",
    nomor_rekening: "",
    nama_pemilik_rekening: "",
    target_gmv: "",
  });

  useEffect(() => {
    fetchCreators();
    fetchCommissionRules();
  }, []);

  const fetchCreators = async () => {
    try {
      const [activeData, pendingData] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "CREATOR")
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "CREATOR")
          .eq("status", "PENDING_APPROVAL")
          .order("created_at", { ascending: false })
      ]);

      if (activeData.error) throw activeData.error;
      if (pendingData.error) throw pendingData.error;
      
      setCreators(activeData.data || []);
      setPendingCreators(pendingData.data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data kreator: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommissionRules = async () => {
    try {
      const { data, error } = await supabase
        .from("aturan_komisi")
        .select("id, nama_aturan");

      if (error) throw error;
      setCommissionRules(data || []);
    } catch (error: any) {
      console.error("Gagal memuat aturan komisi:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingCreator) {
        // Update existing creator
        const { error } = await supabase
          .from("profiles")
          .update({
            name: formData.name,
            tiktok_account: formData.tiktok_account || null,
            niche: formData.niche || null,
            base_salary: parseFloat(formData.base_salary) || 0,
            hourly_rate: parseFloat(formData.hourly_rate) || 0,
            id_aturan_komisi: formData.id_aturan_komisi || null,
            join_date: formData.join_date,
            status: formData.status,
            nama_bank: formData.nama_bank || null,
            nomor_rekening: formData.nomor_rekening || null,
            nama_pemilik_rekening: formData.nama_pemilik_rekening || null,
            target_gmv: parseInt(formData.target_gmv) || 0,
          })
          .eq("id", editingCreator.id);

        if (error) throw error;
        toast.success("Kreator berhasil diperbarui");
      } else {
        // Create new creator via auth (role is set via trigger)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              status: 'ACTIVE'
            },
          },
        });

        if (authError) throw authError;

        // Update profile with all additional data
        if (authData.user) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              tiktok_account: formData.tiktok_account || null,
              niche: formData.niche || null,
              base_salary: parseFloat(formData.base_salary) || 0,
              hourly_rate: parseFloat(formData.hourly_rate) || 0,
              id_aturan_komisi: formData.id_aturan_komisi || null,
              join_date: formData.join_date,
              nama_bank: formData.nama_bank || null,
              nomor_rekening: formData.nomor_rekening || null,
              nama_pemilik_rekening: formData.nama_pemilik_rekening || null,
              target_gmv: parseInt(formData.target_gmv) || 0,
            })
            .eq("id", authData.user.id);

          if (updateError) throw updateError;
        }

        toast.success("Kreator baru berhasil dibuat dan datanya telah disimpan.");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCreators();
    } catch (error: any) {
      toast.error("Gagal menyimpan data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      tiktok_account: "",
      niche: "",
      base_salary: "",
      hourly_rate: "",
      id_aturan_komisi: "",
      join_date: new Date().toISOString().split('T')[0],
      status: "ACTIVE" as "ACTIVE" | "PAUSED",
      nama_bank: "",
      nomor_rekening: "",
      nama_pemilik_rekening: "",
      target_gmv: "",
    });
    setEditingCreator(null);
  };

  const handleEdit = (creator: Creator) => {
    setEditingCreator(creator);
    setFormData({
      name: creator.name,
      email: creator.email,
      password: "",
      tiktok_account: creator.tiktok_account || "",
      niche: creator.niche || "",
      base_salary: creator.base_salary?.toString() || "",
      hourly_rate: creator.hourly_rate?.toString() || "",
      id_aturan_komisi: creator.id_aturan_komisi || "",
      join_date: creator.join_date,
      status: creator.status as "ACTIVE" | "PAUSED",
      nama_bank: creator.nama_bank || "",
      nomor_rekening: creator.nomor_rekening || "",
      nama_pemilik_rekening: creator.nama_pemilik_rekening || "",
      target_gmv: creator.target_gmv?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (creatorId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "ARCHIVED" })
        .eq("id", creatorId);

      if (error) throw error;
      
      toast.success("Kreator berhasil diarsipkan");
      fetchCreators();
    } catch (error: any) {
      toast.error("Gagal mengarsipkan kreator: " + error.message);
    }
  };

  const handleApprove = async (creatorId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "ACTIVE" })
        .eq("id", creatorId);

      if (error) throw error;
      
      toast.success("Kreator berhasil disetujui dan dapat login sekarang");
      fetchCreators();
    } catch (error: any) {
      toast.error("Gagal menyetujui kreator: " + error.message);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kelola Kreator</h1>
        <p className="text-muted-foreground mt-1">
          Tambah, edit, dan kelola data kreator afiliasi.
        </p>
        {pendingCreators.length > 0 && (
          <Badge variant="destructive" className="mt-2">
            {pendingCreators.length} Menunggu Persetujuan
          </Badge>
        )}
      </div>

      {userRole !== 'INVESTOR' && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah Kreator Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCreator ? "Edit Kreator" : "Tambah Kreator Baru"}</DialogTitle>
              <DialogDescription>
                {editingCreator 
                  ? "Perbarui informasi kreator" 
                  : "Masukkan data kreator baru. Untuk kreator baru, lengkapi Gaji Pokok dan info lainnya setelah dibuat."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Nama kreator"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingCreator}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {!editingCreator && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tiktok_account">Akun TikTok</Label>
                  <Input
                    id="tiktok_account"
                    value={formData.tiktok_account}
                    onChange={(e) => setFormData({ ...formData, tiktok_account: e.target.value })}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niche">Niche</Label>
                  <Input
                    id="niche"
                    value={formData.niche}
                    onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    placeholder="Beauty, Fashion, Tech, dll"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_salary">Gaji Pokok (Rp)</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Tarif Per Jam (Rp)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_gmv">Target GMV Bulanan (Rp)</Label>
                <Input
                  id="target_gmv"
                  type="number"
                  value={formData.target_gmv}
                  onChange={(e) => setFormData({ ...formData, target_gmv: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_aturan_komisi">Aturan Komisi</Label>
                  <Select 
                    value={formData.id_aturan_komisi} 
                    onValueChange={(value) => setFormData({ ...formData, id_aturan_komisi: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih aturan komisi" />
                    </SelectTrigger>
                    <SelectContent>
                      {commissionRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.nama_aturan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join_date">Tanggal Bergabung</Label>
                  <Input
                    id="join_date"
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  />
                </div>
              </div>

              {editingCreator && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as "ACTIVE" | "PAUSED" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="PAUSED">PAUSED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Informasi Bank</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama_bank">Nama Bank</Label>
                    <Input
                      id="nama_bank"
                      value={formData.nama_bank}
                      onChange={(e) => setFormData({ ...formData, nama_bank: e.target.value })}
                      placeholder="BCA, Mandiri, BRI, dll"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nomor_rekening">Nomor Rekening</Label>
                      <Input
                        id="nomor_rekening"
                        value={formData.nomor_rekening}
                        onChange={(e) => setFormData({ ...formData, nomor_rekening: e.target.value })}
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nama_pemilik_rekening">Nama Pemilik Rekening</Label>
                      <Input
                        id="nama_pemilik_rekening"
                        value={formData.nama_pemilik_rekening}
                        onChange={(e) => setFormData({ ...formData, nama_pemilik_rekening: e.target.value })}
                        placeholder="Sesuai rekening bank"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Menyimpan..." : (editingCreator ? "Perbarui" : "Tambah Kreator")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Kreator Aktif</TabsTrigger>
          <TabsTrigger value="pending">
            Menunggu Persetujuan
            {pendingCreators.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCreators.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Daftar Kreator Aktif</CardTitle>
              <CardDescription>Kelola semua kreator yang sudah disetujui</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
              ) : creators.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Belum ada kreator aktif.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>TikTok</TableHead>
                        <TableHead>Niche</TableHead>
                        <TableHead>Gaji Pokok</TableHead>
                        <TableHead>Tgl Bergabung</TableHead>
                        <TableHead>Status</TableHead>
                        {userRole !== 'INVESTOR' && <TableHead>Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creators.map((creator) => (
                        <TableRow key={creator.id}>
                          <TableCell className="font-medium">
                            <Link 
                              to={`/kreator/${creator.id}`} 
                              className="hover:underline text-primary"
                            >
                              {creator.name}
                            </Link>
                          </TableCell>
                          <TableCell>{creator.email}</TableCell>
                          <TableCell>{creator.tiktok_account || "-"}</TableCell>
                          <TableCell>{creator.niche || "-"}</TableCell>
                          <TableCell>{formatCurrency(creator.base_salary)}</TableCell>
                          <TableCell>{new Date(creator.join_date).toLocaleDateString("id-ID")}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              creator.status === "ACTIVE" 
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>
                              {creator.status}
                            </span>
                          </TableCell>
                          {userRole !== 'INVESTOR' && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(creator)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Arsipkan Kreator?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Kreator ini akan diarsipkan (soft delete). Data mereka tidak akan dihapus, tapi tidak akan tampil di daftar aktif.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(creator.id)}>
                                        Ya, Arsipkan
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
        </TabsContent>

        <TabsContent value="pending">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Kreator Menunggu Persetujuan</CardTitle>
              <CardDescription>Setujui kreator baru untuk memberikan akses login</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
              ) : pendingCreators.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Tidak ada kreator yang menunggu persetujuan.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCreators.map((creator) => (
                        <TableRow key={creator.id}>
                          <TableCell className="font-medium">{creator.name}</TableCell>
                          <TableCell>{creator.email}</TableCell>
                          <TableCell>{new Date(creator.join_date).toLocaleDateString("id-ID")}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">PENDING</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(creator.id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Setujui
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Tolak Pendaftaran?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Kreator ini akan diarsipkan dan tidak dapat login.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(creator.id)}>
                                      Ya, Tolak
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
      </Tabs>
    </div>
  );
}
