import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Plus, Trash2, Pencil } from "lucide-react";

interface PayrollRules {
  id: string;
  daily_live_target_minutes: number;
  floor_pct: number;
  cap_pct: number;
  minimum_minutes: number;
  workdays: number[];
  holidays: string[];
  minimum_policy: string;
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

export default function Konfigurasi() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [payrollRules, setPayrollRules] = useState<PayrollRules>({
    id: "",
    daily_live_target_minutes: 120,
    floor_pct: 0.60,
    cap_pct: 1.00,
    minimum_minutes: 7800,
    workdays: [1, 2, 3, 4, 5],
    holidays: [],
    minimum_policy: "prorata_with_flag",
  });

  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    nama_aturan: "",
    slabs: [
      { min: 0, max: 5000000, rate: 0.00 },
      { min: 5000000, max: 20000000, rate: 0.20 },
    ] as CommissionSlab[],
  });

  const [newHoliday, setNewHoliday] = useState("");

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const [payrollRes, commissionRes] = await Promise.all([
        supabase.from("aturan_payroll").select("*").maybeSingle(),
        supabase.from("aturan_komisi").select("*"),
      ]);

      if (payrollRes.error) throw payrollRes.error;
      if (commissionRes.error) throw commissionRes.error;

      if (payrollRes.data) {
        setPayrollRules(payrollRes.data);
      }
      if (commissionRes.data) {
        setCommissionRules(commissionRes.data.map(rule => ({
          id: rule.id,
          nama_aturan: rule.nama_aturan,
          slabs: rule.slabs as unknown as CommissionSlab[],
        })));
      }
    } catch (error: any) {
      toast.error("Gagal memuat konfigurasi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePayroll = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("aturan_payroll")
        .update({
          daily_live_target_minutes: payrollRules.daily_live_target_minutes,
          floor_pct: payrollRules.floor_pct,
          cap_pct: payrollRules.cap_pct,
          minimum_minutes: payrollRules.minimum_minutes,
          workdays: payrollRules.workdays,
          holidays: payrollRules.holidays,
          minimum_policy: payrollRules.minimum_policy,
        })
        .eq("id", payrollRules.id);

      if (error) throw error;
      toast.success("Aturan payroll berhasil disimpan");
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCommissionRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingRule) {
        const { error } = await supabase
          .from("aturan_komisi")
          .update({
            nama_aturan: ruleFormData.nama_aturan,
            slabs: ruleFormData.slabs as any,
          })
          .eq("id", editingRule.id);

        if (error) throw error;
        toast.success("Aturan bonus berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("aturan_komisi")
          .insert({
            nama_aturan: ruleFormData.nama_aturan,
            slabs: ruleFormData.slabs as any,
          });

        if (error) throw error;
        toast.success("Aturan bonus baru berhasil ditambahkan");
      }

      setIsDialogOpen(false);
      resetRuleForm();
      fetchRules();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("aturan_komisi")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
      toast.success("Aturan bonus berhasil dihapus");
      fetchRules();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const resetRuleForm = () => {
    setRuleFormData({
      nama_aturan: "",
      slabs: [
        { min: 0, max: 5000000, rate: 0.00 },
        { min: 5000000, max: 20000000, rate: 0.20 },
      ],
    });
    setEditingRule(null);
  };

  const handleEditRule = (rule: CommissionRule) => {
    setEditingRule(rule);
    setRuleFormData({
      nama_aturan: rule.nama_aturan,
      slabs: [...rule.slabs],
    });
    setIsDialogOpen(true);
  };

  const addSlabToForm = () => {
    const lastSlab = ruleFormData.slabs[ruleFormData.slabs.length - 1];
    setRuleFormData({
      ...ruleFormData,
      slabs: [
        ...ruleFormData.slabs,
        { min: lastSlab.max, max: lastSlab.max + 10000000, rate: 0 },
      ],
    });
  };

  const updateSlabInForm = (index: number, field: keyof CommissionSlab, value: number) => {
    const newSlabs = [...ruleFormData.slabs];
    newSlabs[index] = { ...newSlabs[index], [field]: value };
    setRuleFormData({ ...ruleFormData, slabs: newSlabs });
  };

  const removeSlabFromForm = (index: number) => {
    if (ruleFormData.slabs.length > 1) {
      setRuleFormData({
        ...ruleFormData,
        slabs: ruleFormData.slabs.filter((_, i) => i !== index),
      });
    }
  };

  const toggleWorkday = (day: number) => {
    if (payrollRules.workdays.includes(day)) {
      setPayrollRules({
        ...payrollRules,
        workdays: payrollRules.workdays.filter((d) => d !== day),
      });
    } else {
      setPayrollRules({
        ...payrollRules,
        workdays: [...payrollRules.workdays, day].sort(),
      });
    }
  };

  const addHoliday = () => {
    if (newHoliday && !payrollRules.holidays.includes(newHoliday)) {
      setPayrollRules({
        ...payrollRules,
        holidays: [...payrollRules.holidays, newHoliday].sort(),
      });
      setNewHoliday("");
    }
  };

  const removeHoliday = (date: string) => {
    setPayrollRules({
      ...payrollRules,
      holidays: payrollRules.holidays.filter((h) => h !== date),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const weekdays = [
    { value: 0, label: "Minggu" },
    { value: 1, label: "Senin" },
    { value: 2, label: "Selasa" },
    { value: 3, label: "Rabu" },
    { value: 4, label: "Kamis" },
    { value: 5, label: "Jumat" },
    { value: 6, label: "Sabtu" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Memuat konfigurasi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Konfigurasi Sistem</h1>
        <p className="text-muted-foreground mt-1">
          Atur aturan payroll dan komisi untuk perhitungan gaji.
        </p>
      </div>

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payroll">Aturan Payroll</TabsTrigger>
          <TabsTrigger value="komisi">Aturan Bonus</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Aturan Payroll</CardTitle>
              <CardDescription>
                Konfigurasi aturan perhitungan gaji pokok kreator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="daily_target">Target Menit Live Per Hari</Label>
                  <Input
                    id="daily_target"
                    type="number"
                    value={payrollRules.daily_live_target_minutes}
                    onChange={(e) =>
                      setPayrollRules({
                        ...payrollRules,
                        daily_live_target_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Saat ini: {payrollRules.daily_live_target_minutes} menit ({Math.floor(payrollRules.daily_live_target_minutes / 60)} jam)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_minutes">Minimum Total Menit Per Bulan</Label>
                  <Input
                    id="minimum_minutes"
                    type="number"
                    value={payrollRules.minimum_minutes}
                    onChange={(e) =>
                      setPayrollRules({
                        ...payrollRules,
                        minimum_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Saat ini: {payrollRules.minimum_minutes} menit ({Math.floor(payrollRules.minimum_minutes / 60)} jam)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor_pct">Floor Percentage (Batas Bawah)</Label>
                  <Input
                    id="floor_pct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={payrollRules.floor_pct}
                    onChange={(e) =>
                      setPayrollRules({
                        ...payrollRules,
                        floor_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Saat ini: {(payrollRules.floor_pct * 100).toFixed(0)}% dari gaji pokok
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cap_pct">Cap Percentage (Batas Atas)</Label>
                  <Input
                    id="cap_pct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={payrollRules.cap_pct}
                    onChange={(e) =>
                      setPayrollRules({
                        ...payrollRules,
                        cap_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Saat ini: {(payrollRules.cap_pct * 100).toFixed(0)}% dari gaji pokok
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Hari Kerja</Label>
                <div className="grid grid-cols-7 gap-2">
                  {weekdays.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={payrollRules.workdays.includes(day.value)}
                        onCheckedChange={() => toggleWorkday(day.value)}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Tanggal Libur</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                  />
                  <Button type="button" onClick={addHoliday} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {payrollRules.holidays.length > 0 && (
                  <div className="space-y-2">
                    {payrollRules.holidays.map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <span className="text-sm">
                          {new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHoliday(date)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSavePayroll} disabled={isSaving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Menyimpan..." : "Simpan Aturan Payroll"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="komisi" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Aturan Bonus</CardTitle>
                  <CardDescription>
                    Kelola skema bonus komisi untuk kreator
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetRuleForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Aturan Bonus
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRule ? "Edit Aturan Bonus" : "Tambah Aturan Bonus Baru"}
                      </DialogTitle>
                      <DialogDescription>
                        Buat skema bonus komisi dengan slab progresif
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveCommissionRule} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nama_aturan">Nama Aturan *</Label>
                        <Input
                          id="nama_aturan"
                          value={ruleFormData.nama_aturan}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, nama_aturan: e.target.value })}
                          placeholder="Contoh: Bonus Afiliasi, Bonus Host Internal"
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Slab Komisi</Label>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>GMV Min</TableHead>
                                <TableHead>GMV Max</TableHead>
                                <TableHead>Rate (%)</TableHead>
                                <TableHead className="w-[70px]">Aksi</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ruleFormData.slabs.map((slab, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={slab.min}
                                      onChange={(e) =>
                                        updateSlabInForm(index, "min", parseInt(e.target.value) || 0)
                                      }
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatCurrency(slab.min)}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={slab.max}
                                      onChange={(e) =>
                                        updateSlabInForm(index, "max", parseInt(e.target.value) || 0)
                                      }
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatCurrency(slab.max)}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="1"
                                      value={slab.rate}
                                      onChange={(e) =>
                                        updateSlabInForm(index, "rate", parseFloat(e.target.value) || 0)
                                      }
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {(slab.rate * 100).toFixed(0)}%
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSlabFromForm(index)}
                                      disabled={ruleFormData.slabs.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <Button type="button" onClick={addSlabToForm} variant="outline" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Slab
                        </Button>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? "Menyimpan..." : "Simpan"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {commissionRules.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-2">
                    Belum ada aturan bonus
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Klik tombol "Tambah Aturan Bonus" untuk membuat skema baru
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Aturan</TableHead>
                        <TableHead>Jumlah Slab</TableHead>
                        <TableHead>Range GMV</TableHead>
                        <TableHead className="w-[100px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionRules.map((rule) => {
                        const minGmv = Math.min(...rule.slabs.map(s => s.min));
                        const maxGmv = Math.max(...rule.slabs.map(s => s.max));
                        return (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium">{rule.nama_aturan}</TableCell>
                            <TableCell>{rule.slabs.length} tier</TableCell>
                            <TableCell>
                              {formatCurrency(minGmv)} - {formatCurrency(maxGmv)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRule(rule)}
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
                                      <AlertDialogTitle>Hapus Aturan Bonus?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Aturan "{rule.nama_aturan}" akan dihapus. Kreator yang menggunakan aturan ini tidak akan mendapat bonus.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteRule(rule.id)}>
                                        Ya, Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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