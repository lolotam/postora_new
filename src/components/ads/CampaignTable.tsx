import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Campaign } from "@/hooks/useAdAnalytics";

interface CampaignTableProps {
  campaigns: Campaign[];
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE": return "default";
    case "PAUSED": return "secondary";
    case "DELETED":
    case "ARCHIVED": return "destructive";
    default: return "outline";
  }
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Objective</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">CPC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No campaigns found
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((c) => {
              const insight = c.insights?.data?.[0];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{c.objective?.replace(/_/g, " ").toLowerCase()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(insight?.impressions || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(insight?.clicks || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{parseFloat(insight?.ctr || "0").toFixed(2)}%</TableCell>
                  <TableCell className="text-right tabular-nums">${parseFloat(insight?.spend || "0").toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">${parseFloat(insight?.cpc || "0").toFixed(2)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
