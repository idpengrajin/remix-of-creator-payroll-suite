import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CreatorSales {
  user_id: string;
  name: string;
  gmv: number;
  commission: number;
}

interface CreatorSalesTableProps {
  creatorSales: CreatorSales[];
  formatCurrency: (value: number) => string;
  loading: boolean;
}

export default function CreatorSalesTable({ creatorSales, formatCurrency, loading }: CreatorSalesTableProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Laporan Per Kreator</CardTitle>
        <CardDescription>Ringkasan penjualan setiap kreator</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : creatorSales.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Belum ada data penjualan pada periode ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kreator</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatorSales.map((creator) => (
                <TableRow key={creator.user_id}>
                  <TableCell className="font-medium">{creator.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(creator.gmv)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(creator.commission)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
