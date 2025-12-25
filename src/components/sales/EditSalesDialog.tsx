import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SalesData {
  id: string;
  user_id: string;
  date: string;
  source: "TIKTOK" | "SHOPEE";
  gmv: number;
  commission_gross: number;
  profiles?: {
    name: string;
  };
}

interface EditSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SalesData | null;
  onSave: (id: string, data: { date: string; source: "TIKTOK" | "SHOPEE"; gmv: number; commission_gross: number }) => void;
}

export default function EditSalesDialog({
  open,
  onOpenChange,
  sale,
  onSave,
}: EditSalesDialogProps) {
  const [date, setDate] = useState("");
  const [source, setSource] = useState<"TIKTOK" | "SHOPEE">("TIKTOK");
  const [gmv, setGmv] = useState("");
  const [commission, setCommission] = useState("");

  useEffect(() => {
    if (sale) {
      setDate(sale.date);
      setSource(sale.source);
      setGmv(sale.gmv.toString());
      setCommission(sale.commission_gross.toString());
    }
  }, [sale]);

  if (!sale) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitData = {
      date,
      source,
      gmv: parseFloat(gmv) || 0,
      commission_gross: parseFloat(commission) || 0,
    };
    console.log("EditSalesDialog submitting:", submitData);
    console.log("Current state:", { date, source, gmv, commission });
    onSave(sale.id, submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Data Penjualan</DialogTitle>
          <DialogDescription>
            {sale.profiles?.name && `Kreator: ${sale.profiles.name}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Tanggal
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source" className="text-right">
                Platform
              </Label>
              <Select value={source} onValueChange={(val) => setSource(val as "TIKTOK" | "SHOPEE")}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="SHOPEE">Shopee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gmv" className="text-right">
                GMV
              </Label>
              <Input
                id="gmv"
                type="number"
                step="0.01"
                value={gmv}
                onChange={(e) => setGmv(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="commission_gross" className="text-right">
                Komisi
              </Label>
              <Input
                id="commission_gross"
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
