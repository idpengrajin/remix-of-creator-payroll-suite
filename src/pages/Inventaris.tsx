import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  nama_barang: string;
  kategori: string;
  status: string;
  peminjam_id: string | null;
  catatan: string | null;
  created_at: string;
  profiles?: {
    name: string;
  };
}

interface Profile {
  id: string;
  name: string;
}

export default function Inventaris() {
  const { userRole } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    nama_barang: "",
    kategori: "Sample",
    status: "Tersedia",
    peminjam_id: "",
    catatan: "",
  });

  useEffect(() => {
    fetchItems();
    fetchProfiles();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          *,
          profiles:peminjam_id (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data as any || []);
    } catch (error: any) {
      toast.error("Gagal memuat data inventaris: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data pengguna: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSubmit = {
        nama_barang: formData.nama_barang,
        kategori: formData.kategori,
        status: formData.status,
        peminjam_id: formData.peminjam_id || null,
        catatan: formData.catatan || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(dataToSubmit)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Barang berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert(dataToSubmit);

        if (error) throw error;
        toast.success("Barang berhasil ditambahkan");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error("Gagal menyimpan data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_barang: "",
      kategori: "Sample",
      status: "Tersedia",
      peminjam_id: "",
      catatan: "",
    });
    setEditingItem(null);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      status: item.status,
      peminjam_id: item.peminjam_id || "",
      catatan: item.catatan || "",
    });
    setIsDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventaris</h1>
        <p className="text-muted-foreground mt-1">
          Kelola inventaris barang dan alat konten agensi
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Inventaris</CardTitle>
              <CardDescription>Kelola semua barang inventaris</CardDescription>
            </div>
            {userRole !== 'INVESTOR' && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Barang
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Barang" : "Tambah Barang Baru"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem 
                      ? "Perbarui informasi barang"
                      : "Isi form di bawah untuk menambah barang baru"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama_barang">Nama Barang *</Label>
                    <Input
                      id="nama_barang"
                      value={formData.nama_barang}
                      onChange={(e) => setFormData({ ...formData, nama_barang: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kategori">Kategori *</Label>
                    <Select
                      value={formData.kategori}
                      onValueChange={(value) => setFormData({ ...formData, kategori: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sample">Sample</SelectItem>
                        <SelectItem value="Alat Konten">Alat Konten</SelectItem>
                        <SelectItem value="Perlengkapan">Perlengkapan</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tersedia">Tersedia</SelectItem>
                        <SelectItem value="Dipinjam">Dipinjam</SelectItem>
                        <SelectItem value="Rusak">Rusak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="peminjam_id">Peminjam (jika dipinjam)</Label>
                    <Select
                      value={formData.peminjam_id || undefined}
                      onValueChange={(value) => setFormData({ ...formData, peminjam_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tidak ada / Pilih peminjam" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catatan">Catatan</Label>
                    <Textarea
                      id="catatan"
                      value={formData.catatan}
                      onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                      placeholder="Catatan tambahan..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : items.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Belum ada barang. Klik tombol di atas untuk menambahkan.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Peminjam</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Tgl Ditambahkan</TableHead>
                    {userRole !== 'INVESTOR' && <TableHead>Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nama_barang}</TableCell>
                      <TableCell>{item.kategori}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "Tersedia" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : item.status === "Dipinjam"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>{item.profiles?.name || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.catatan || "-"}</TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      {userRole !== 'INVESTOR' && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}
