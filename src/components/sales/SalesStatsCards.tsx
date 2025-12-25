import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesStatsCardsProps {
  totalGMV: number;
  totalCommission: number;
  formatCurrency: (value: number) => string;
}

export default function SalesStatsCards({ totalGMV, totalCommission, formatCurrency }: SalesStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalGMV)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Komisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
