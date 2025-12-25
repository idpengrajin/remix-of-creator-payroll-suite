import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Creator {
  id: string;
  name: string;
}

interface AddSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    date: string;
    source: "TIKTOK" | "SHOPEE";
    gmv: string;
    commission_gross: string;
    user_id?: string;
  };
  onFormDataChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAdmin?: boolean;
  creators?: Creator[];
}

export default function AddSalesDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isAdmin = false,
  creators = []
}: AddSalesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Laporan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Laporan Penjualan</DialogTitle>
          <DialogDescription>
            {isAdmin ? "Input laporan penjualan harian untuk kreator" : "Input laporan penjualan harian"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {isAdmin && creators.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="creator">Kreator</Label>
              <Select
                value={formData.user_id || ""}
                onValueChange={(value) => 
                  onFormDataChange({ ...formData, user_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kreator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => onFormDataChange({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Platform</Label>
            <Select
              value={formData.source}
              onValueChange={(value: "TIKTOK" | "SHOPEE") => 
                onFormDataChange({ ...formData, source: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="SHOPEE">Shopee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gmv">GMV (IDR)</Label>
            <Input
              id="gmv"
              type="number"
              value={formData.gmv}
              onChange={(e) => onFormDataChange({ ...formData, gmv: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission_gross">Komisi (IDR)</Label>
            <Input
              id="commission_gross"
              type="number"
              value={formData.commission_gross}
              onChange={(e) => onFormDataChange({ ...formData, commission_gross: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isAdmin && !formData.user_id}>
            Simpan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
