import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

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

interface DailySalesTableProps {
  salesData: SalesData[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  loading: boolean;
  showCreatorColumn: boolean;
  isAdmin?: boolean;
  onEdit?: (sale: SalesData) => void;
}

export default function DailySalesTable({ 
  salesData, 
  formatCurrency, 
  formatDate, 
  loading,
  showCreatorColumn,
  isAdmin = false,
  onEdit
}: DailySalesTableProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Laporan Penjualan Harian</CardTitle>
        <CardDescription>Riwayat penjualan harian</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : salesData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Belum ada data penjualan pada periode ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {showCreatorColumn && <TableHead>Kreator</TableHead>}
                <TableHead>Tanggal</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                {isAdmin && <TableHead className="w-[80px]">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.map((sale) => (
                <TableRow key={sale.id}>
                  {showCreatorColumn && (
                    <TableCell className="font-medium">
                      {sale.profiles?.name || "-"}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(sale.date)}</TableCell>
                  <TableCell>{sale.source}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sale.gmv)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sale.commission_gross)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit?.(sale)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}