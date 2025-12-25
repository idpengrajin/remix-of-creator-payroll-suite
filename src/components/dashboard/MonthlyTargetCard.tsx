import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface MonthlyTargetCardProps {
  currentGMV: number;
  targetGMV: number;
}

export function MonthlyTargetCard({ currentGMV, targetGMV }: MonthlyTargetCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  const percentage = targetGMV > 0 ? Math.min((currentGMV / targetGMV) * 100, 150) : 0;
  const displayPercentage = Math.round(percentage);
  const isCompleted = percentage >= 100;
  const isOnTrack = percentage >= 50 && percentage < 100;
  const isBehind = percentage < 50;

  useEffect(() => {
    if (isCompleted) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getProgressColor = () => {
    if (isCompleted) return "bg-green-500";
    if (isOnTrack) return "bg-primary";
    return "bg-orange-500";
  };

  const getStatusText = () => {
    if (isCompleted) return "Target Tercapai! 🎉";
    if (isOnTrack) return "On Track";
    return "Perlu Ditingkatkan";
  };

  const getStatusColor = () => {
    if (isCompleted) return "text-green-500";
    if (isOnTrack) return "text-primary";
    return "text-orange-500";
  };

  if (targetGMV === 0) {
    return (
      <Card className="col-span-full lg:col-span-2 border-dashed">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Target Bulan Ini</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Target belum ditentukan oleh Admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "col-span-full lg:col-span-2 relative overflow-hidden transition-all duration-300",
      isCompleted && "border-green-500/50 bg-green-500/5"
    )}>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute text-yellow-400 animate-bounce",
                "w-4 h-4"
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Target Bulan Ini
        </CardTitle>
        <span className={cn("text-xs font-medium", getStatusColor())}>
          {getStatusText()}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Large Percentage Display */}
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "text-5xl font-bold tracking-tight",
            getStatusColor()
          )}>
            {displayPercentage}
          </span>
          <span className={cn("text-2xl font-semibold", getStatusColor())}>%</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Progress 
              value={Math.min(percentage, 100)} 
              className="h-3 bg-secondary"
            />
            <div 
              className={cn(
                "absolute top-0 left-0 h-3 rounded-full transition-all duration-500",
                getProgressColor()
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Detail Text */}
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{formatCurrency(currentGMV)}</span>
          {" / "}
          <span>{formatCurrency(targetGMV)}</span>
        </p>

        {/* Remaining Amount */}
        {!isCompleted && (
          <p className="text-xs text-muted-foreground">
            Sisa target: <span className="font-medium">{formatCurrency(targetGMV - currentGMV)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}