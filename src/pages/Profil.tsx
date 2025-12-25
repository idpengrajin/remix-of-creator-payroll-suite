import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock } from "lucide-react";
import { profileSchema, passwordChangeSchema } from "@/lib/validation";

export default function Profil() {
  const { user, updateUserName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    tiktok_account: "",
    nama_bank: "",
    nomor_rekening: "",
    nama_pemilik_rekening: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, tiktok_account, nama_bank, nomor_rekening, nama_pemilik_rekening")
        .eq("id", user!.id)
        .single();

      if (error) throw error;

      setProfileData({
        name: data.name || "",
        tiktok_account: data.tiktok_account || "",
        nama_bank: data.nama_bank || "",
        nomor_rekening: data.nomor_rekening || "",
        nama_pemilik_rekening: data.nama_pemilik_rekening || "",
      });
    } catch (error: any) {
      toast.error("Gagal memuat profil: " + error.message);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = profileSchema.parse(profileData);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          name: validatedData.name,
          tiktok_account: validatedData.tiktok_account || null,
          nama_bank: validatedData.nama_bank || null,
          nomor_rekening: validatedData.nomor_rekening || null,
          nama_pemilik_rekening: validatedData.nama_pemilik_rekening || null,
        })
        .eq("id", user!.id);

      if (error) throw error;

      toast.success("Profil berhasil diperbarui");
      updateUserName(validatedData.name);
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Gagal memperbarui profil: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = passwordChangeSchema.parse(passwordData);
      
      const { error } = await supabase.auth.updateUser({
        password: validatedData.newPassword,
      });

      if (error) throw error;

      toast.success("Password berhasil diubah");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Gagal mengubah password: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">
          Kelola informasi profil dan keamanan akun Anda
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Edit Profil</CardTitle>
          </div>
          <CardDescription>Perbarui informasi profil Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_account">Akun TikTok</Label>
              <Input
                id="tiktok_account"
                value={profileData.tiktok_account}
                onChange={(e) => setProfileData({ ...profileData, tiktok_account: e.target.value })}
                placeholder="@username"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Ganti Password</CardTitle>
          </div>
          <CardDescription>Ubah password akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru *</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Informasi Bank</CardTitle>
          </div>
          <CardDescription>Data rekening untuk penggajian</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_bank">Nama Bank</Label>
              <Input
                id="nama_bank"
                value={profileData.nama_bank}
                onChange={(e) => setProfileData({ ...profileData, nama_bank: e.target.value })}
                placeholder="Contoh: BCA, Mandiri, BRI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomor_rekening">Nomor Rekening</Label>
              <Input
                id="nomor_rekening"
                value={profileData.nomor_rekening}
                onChange={(e) => setProfileData({ ...profileData, nomor_rekening: e.target.value })}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama_pemilik_rekening">Nama Pemilik Rekening</Label>
              <Input
                id="nama_pemilik_rekening"
                value={profileData.nama_pemilik_rekening}
                onChange={(e) => setProfileData({ ...profileData, nama_pemilik_rekening: e.target.value })}
                placeholder="Sesuai dengan nama di rekening"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Informasi Bank"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
