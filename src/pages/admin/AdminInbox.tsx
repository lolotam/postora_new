import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminInbox as AdminInboxComponent } from "@/components/admin/inbox/AdminInbox";

export default function AdminInbox() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Email Inbox</h1>
          <p className="text-muted-foreground">
            View and respond to emails sent to admin@postora.cloud and support@postora.cloud
          </p>
        </div>

        <AdminInboxComponent />
      </div>
    </AdminLayout>
  );
}
