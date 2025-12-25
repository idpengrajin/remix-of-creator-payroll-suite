import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AgencySwitcher() {
  const { currentAgency, agencies, switchAgency, agencyRole } = useAuth();

  if (!currentAgency || agencies.length === 0) {
    return null;
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "FREE":
        return <Badge variant="outline" className="text-xs ml-2">Free</Badge>;
      case "PRO":
        return <Badge className="bg-blue-500 text-xs ml-2">Pro</Badge>;
      case "ENTERPRISE":
        return <Badge className="bg-purple-500 text-xs ml-2">Enterprise</Badge>;
      default:
        return null;
    }
  };

  // If user only has one agency, just show the name
  if (agencies.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded-md">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[150px]">{currentAgency.name}</span>
        {getPlanBadge(currentAgency.subscription_plan)}
      </div>
    );
  }

  return (
    <Select value={currentAgency.id} onValueChange={switchAgency}>
      <SelectTrigger className="w-auto min-w-[180px] max-w-[250px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Pilih Agensi" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {agencies.map((membership) => (
          <SelectItem key={membership.agency_id} value={membership.agency_id}>
            <div className="flex items-center gap-2">
              <span>{membership.agency.name}</span>
              {getPlanBadge(membership.agency.subscription_plan)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}