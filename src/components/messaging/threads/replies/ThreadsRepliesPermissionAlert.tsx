import { AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  reason?: string;
}

export function ThreadsRepliesPermissionAlert({ reason }: Props) {
  const isExpired = reason === "expired_token" || reason === "invalid_token";
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isExpired ? "Threads connection expired" : "Reconnect required"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          {isExpired
            ? "Your Threads access token has expired. Reconnect to continue managing replies."
            : "Your Threads account is missing the permissions needed to read or manage replies. Reconnect to grant access."}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/profiles">
            Reconnect Threads
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}