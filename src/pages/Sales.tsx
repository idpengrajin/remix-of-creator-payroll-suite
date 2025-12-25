import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import SalesStatsCards from "@/components/sales/SalesStatsCards";
import CreatorSalesTable from "@/components/sales/CreatorSalesTable";
import DailySalesTable from "@/components/sales/DailySalesTable";
import AddSalesDialog from "@/components/sales/AddSalesDialog";
import EditSalesDialog from "@/components/sales/EditSalesDialog";
import DateRangeFilter from "@/components/sales/DateRangeFilter";

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

interface CreatorSales {
  user_id: string;
  name: string;
  gmv: number;
  commission: number;
}

export default function Sales() {
  const { userRole } = useAuth();
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [creatorSales, setCreatorSales] = useState<CreatorSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [creators, setCreators] = useState<{ id: string; name: string }[]>([]);
  const [filterType, setFilterType] = useState<"daily" | "weekly" | "monthly" | "custom">("daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    source: "TIKTOK" as "TIKTOK" | "SHOPEE",
    gmv: "",
    commission_gross: "",
    user_id: ""
  });
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      applyDateFilter();
    }
  }, [currentUser, filterType]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // Fetch creators list for admin
      if (profile?.role === "ADMIN") {
        const { data: creatorsData } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("role", "CREATOR")
          .eq("status", "ACTIVE")
          .order("name");
        setCreators(creatorsData || []);
      }
    }
  };

  const getDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (filterType) {
      case "daily":
        start = today;
        end = today;
        break;
      case "weekly":
        start = new Date(today.setDate(today.getDate() - 7));
        end = new Date();
        break;
      case "monthly":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "custom":
        start = new Date(startDate);
        end = new Date(endDate);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const applyDateFilter = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      let query = supabase
        .from("penjualan_harian")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      // Filter by user for creators
      if (currentUser?.role === "CREATOR") {
        query = query.eq("user_id", currentUser.id);
      }

      const salesResponse = await query;
      if (salesResponse.error) throw salesResponse.error;

      const profilesResponse = await supabase
        .from("profiles")
        .select("id, name");

      if (profilesResponse.error) throw profilesResponse.error;

      const profilesMap = new Map(profilesResponse.data?.map(p => [p.id, p]) || []);
      const salesWithProfiles = salesResponse.data?.map(sale => ({
        ...sale,
        profiles: profilesMap.get(sale.user_id)
      })) || [];

      setSalesData(salesWithProfiles);

      // Calculate per-creator stats for admin
      if (currentUser?.role === "ADMIN") {
        const creatorStats = new Map<string, { name: string; gmv: number; commission: number }>();
        
        salesWithProfiles.forEach(sale => {
          const existing = creatorStats.get(sale.user_id) || { 
            name: sale.profiles?.name || "Unknown", 
            gmv: 0, 
            commission: 0 
          };
          creatorStats.set(sale.user_id, {
            name: existing.name,
            gmv: existing.gmv + sale.gmv,
            commission: existing.commission + sale.commission_gross
          });
        });

        const creatorSalesArray = Array.from(creatorStats.entries()).map(([user_id, data]) => ({
          user_id,
          ...data
        }));

        setCreatorSales(creatorSalesArray);
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Admin can input for specific creator, otherwise use current user
      const targetUserId = currentUser?.role === "ADMIN" && formData.user_id 
        ? formData.user_id 
        : user.id;

      const { error } = await supabase
        .from("penjualan_harian")
        .insert({
          user_id: targetUserId,
          date: formData.date,
          source: formData.source,
          gmv: parseFloat(formData.gmv),
          commission_gross: parseFloat(formData.commission_gross)
        });

      if (error) throw error;

      toast.success("Data penjualan berhasil ditambahkan");

      setDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        source: "TIKTOK",
        gmv: "",
        commission_gross: "",
        user_id: ""
      });
      applyDateFilter();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleEditSale = async (id: string, data: { date: string; source: "TIKTOK" | "SHOPEE"; gmv: number; commission_gross: number }) => {
    console.log("handleEditSale called with:", { id, data });
    try {
      const { error, data: result } = await supabase
        .from("penjualan_harian")
        .update({
          date: data.date,
          source: data.source,
          gmv: data.gmv,
          commission_gross: data.commission_gross
        })
        .eq("id", id)
        .select();

      console.log("Update result:", { error, result });

      if (error) throw error;

      toast.success("Data penjualan berhasil diperbarui");
      setEditDialogOpen(false);
      setEditingSale(null);
      applyDateFilter();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error("Error: " + error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });
  };

  const totalGMV = salesData.reduce((sum, s) => sum + s.gmv, 0);
  const totalCommission = salesData.reduce((sum, s) => sum + s.commission_gross, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Penjualan Harian</h1>
        <p className="text-muted-foreground mt-1">
          {currentUser?.role === "ADMIN" 
            ? "Statistik dan laporan penjualan harian dari semua kreator" 
            : "Input laporan penjualan harian Anda"}
        </p>
      </div>

      <DateRangeFilter
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApplyFilter={applyDateFilter}
      />

      <SalesStatsCards
        totalGMV={totalGMV}
        totalCommission={totalCommission}
        formatCurrency={formatCurrency}
      />

      {currentUser?.role === "ADMIN" ? (
        <>
          <div className="flex justify-end">
            <AddSalesDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              formData={formData}
              onFormDataChange={setFormData}
              onSubmit={handleSubmit}
              isAdmin={true}
              creators={creators}
            />
          </div>

          <CreatorSalesTable
            creatorSales={creatorSales}
            formatCurrency={formatCurrency}
            loading={loading}
          />
          
          <DailySalesTable
            salesData={salesData}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            loading={loading}
            showCreatorColumn={true}
            isAdmin={true}
            onEdit={(sale) => {
              setEditingSale(sale);
              setEditDialogOpen(true);
            }}
          />

          <EditSalesDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            sale={editingSale}
            onSave={handleEditSale}
          />
        </>
      ) : (
        <>
          {userRole !== 'INVESTOR' && (
            <div className="flex justify-end">
              <AddSalesDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                formData={formData}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
              />
            </div>
          )}

          <DailySalesTable
            salesData={salesData}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            loading={loading}
            showCreatorColumn={false}
          />
        </>
      )}
    </div>
  );
}
