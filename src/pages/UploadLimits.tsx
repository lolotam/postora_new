import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Clock } from "lucide-react";

const platformLimits = [
  { platform: "Instagram", cap: 50 },
  { platform: "TikTok", cap: 15 },
  { platform: "LinkedIn", cap: 150 },
  { platform: "YouTube", cap: 10 },
  { platform: "Facebook", cap: 25 },
  { platform: "X (Twitter)", cap: 50 },
  { platform: "Pinterest", cap: 20 },
];

export default function UploadLimits() {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Upload Limits</h1>
          <p className="text-muted-foreground mt-2">
            Understand the posting limits to protect your accounts and stay compliant.
          </p>
        </div>

        {/* Social Hard Caps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Social Hard Caps Per Network
            </CardTitle>
            <CardDescription>
              To protect your connected accounts and stay compliant with each social network, 
              we enforce platform hard caps using a rolling 24-hour window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Social Network</TableHead>
                    <TableHead className="text-right">Hard Cap (posts per 24h)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformLimits.map((item) => (
                    <TableRow key={item.platform}>
                      <TableCell className="font-medium">{item.platform}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.cap}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>What counts:</strong> Only successful publishes recorded for that account/network in the last 24 hours.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Scope:</strong> Per connected social account. These limits are NOT global to your user.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Scheduled posts:</strong> Caps are re-checked at execution time; if the cap is already reached, the publish will be rejected.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Error Response */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              When Cap Is Reached
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              When a cap is reached, you'll receive a 429 Too Many Requests error:
            </p>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "success": false,
  "message": "Post verification failed",
  "violations": [
    {
      "platform": "instagram",
      "type": "hard_cap",
      "message": "Daily cap reached: 50/50 in last 24h",
      "used_last_24h": 50,
      "cap": 50
    }
  ]
}`}
            </pre>
          </CardContent>
        </Card>

        {/* Additional Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Content Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Duplicate/similar content within 48h to reduce spam risk</li>
              <li>• Mention limits to avoid spammy behavior</li>
              <li>• Media and content sanity checks aligned with network guidelines</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}