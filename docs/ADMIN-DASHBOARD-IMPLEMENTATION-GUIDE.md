# Postora Admin Dashboard - Complete Implementation Guide

> A comprehensive technical specification for building admin dashboard sections including Email Inbox, System Logs, Coupons, Users, Observability, Analytics, and Dashboard.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack & Patterns](#tech-stack--patterns)
3. [Database Schema Reference](#database-schema-reference)
4. [Admin Layout & Access Control](#admin-layout--access-control)
5. [Section: Dashboard](#section-dashboard)
6. [Section: Analytics](#section-analytics)
7. [Section: Users](#section-users)
8. [Section: Coupons](#section-coupons)
9. [Section: System Logs](#section-system-logs)
10. [Section: Email Inbox](#section-email-inbox)
11. [Section: Observability](#section-observability)
12. [Edge Functions Reference](#edge-functions-reference)
13. [Component Patterns](#component-patterns)
14. [Security Best Practices](#security-best-practices)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard                          │
├─────────────────────────────────────────────────────────────────┤
│  AdminLayout (wrapper with sidebar + auth check)                │
│  ├── AdminDashboard      - Overview stats & quick actions       │
│  ├── AdminAnalytics      - Charts & metrics visualization       │
│  ├── AdminUsers          - User management with bulk actions    │
│  ├── AdminCoupons        - Discount code management             │
│  ├── AdminLogs           - System event monitoring              │
│  ├── AdminInbox          - Email management system              │
│  └── AdminObservability  - Health monitoring & alerts           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                             │
│  ├── Database Tables (with RLS policies)                        │
│  ├── Edge Functions (for complex operations)                    │
│  ├── Realtime Subscriptions (for live updates)                  │
│  └── Storage Buckets (for media/attachments)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack & Patterns

### Core Technologies
```typescript
// Frontend
React 18 + TypeScript + Vite
Tailwind CSS + shadcn/ui components
TanStack Query (data fetching & caching)
React Router v6 (routing)
Recharts (data visualization)
date-fns (date formatting)

// Backend
Supabase (PostgreSQL + Auth + Edge Functions + Storage)
Resend (email delivery)
```

### Key Patterns

#### 1. Data Fetching with TanStack Query
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fetch pattern
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["admin-resource-name", filterParam],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  refetchInterval: 30000, // Optional: auto-refresh every 30s
});

// Mutation pattern
const mutation = useMutation({
  mutationFn: async (payload) => {
    const { error } = await supabase.from("table").insert(payload);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin-resource-name"] });
    toast({ title: "Success message" });
  },
  onError: (error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});
```

#### 2. Admin Role Check
```typescript
import { useUserRole } from "@/hooks/useUserRole";

function AdminComponent() {
  const { isAdmin, isLoading } = useUserRole();
  
  if (isLoading) return <Loader />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  
  return <AdminContent />;
}
```

#### 3. Real-time Subscriptions
```typescript
useEffect(() => {
  const channel = supabase
    .channel("channel-name")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "table_name" },
      (payload) => {
        // Handle new record
        queryClient.invalidateQueries({ queryKey: ["query-key"] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## Database Schema Reference

### Core Admin Tables

```sql
-- User Roles (CRITICAL: Never store on profiles table)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL, -- 'user' | 'admin' | 'subscriber'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security function to check roles
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Section-Specific Tables

#### System Logs
```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info', -- 'info' | 'warn' | 'error' | 'debug'
  category TEXT NOT NULL DEFAULT 'system', -- 'token' | 'edge' | 'post' | 'auth' | 'system'
  source TEXT NOT NULL, -- e.g., 'refresh-tokens', 'process-post'
  message TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all logs" ON system_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

#### Coupons
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER,
  discount_amount NUMERIC,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view active coupons" ON coupons
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);
```

#### Email Inbox
```sql
CREATE TABLE admin_inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  direction TEXT DEFAULT 'inbound', -- 'inbound' | 'outbound'
  status TEXT DEFAULT 'received', -- 'received' | 'sent' | 'failed'
  is_read BOOLEAN DEFAULT false,
  thread_id UUID,
  reply_to_id UUID REFERENCES admin_inbox_messages(id),
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  resend_id TEXT, -- External email service ID
  admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Observability
```sql
-- Health Snapshots (captured every 5 mins via cron)
CREATE TABLE observability_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_health_score INTEGER NOT NULL,
  edge_functions_health INTEGER,
  database_health INTEGER,
  token_health INTEGER,
  cron_health INTEGER,
  active_errors_count INTEGER DEFAULT 0,
  failed_functions_count INTEGER DEFAULT 0,
  slow_queries_count INTEGER DEFAULT 0,
  unhealthy_tokens_count INTEGER DEFAULT 0,
  metrics_breakdown JSONB DEFAULT '{}',
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Configurations
CREATE TABLE observability_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'error_rate' | 'response_time' | 'health_score' | etc.
  metric_type TEXT,
  metric_name TEXT,
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT DEFAULT 'gte', -- 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  time_window_minutes INTEGER DEFAULT 5,
  cooldown_minutes INTEGER DEFAULT 30,
  notification_channels TEXT[] DEFAULT ARRAY['email'],
  notification_emails TEXT[],
  webhook_url TEXT, -- For Slack integration
  last_triggered_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert History
CREATE TABLE observability_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES observability_alert_configs(id),
  alert_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  triggered_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
  details JSONB DEFAULT '{}',
  notification_sent BOOLEAN DEFAULT false,
  notification_channel TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metrics (aggregated performance data)
CREATE TABLE observability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'edge_function' | 'database' | 'api'
  metric_name TEXT NOT NULL,
  metric_category TEXT DEFAULT 'general',
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_ms NUMERIC,
  min_duration_ms NUMERIC,
  max_duration_ms NUMERIC,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Admin Layout & Access Control

### AdminLayout Component Pattern
```typescript
// src/components/admin/AdminLayout.tsx
import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Ticket, label: "Coupons", href: "/admin/coupons" },
  { icon: ScrollText, label: "System Logs", href: "/admin/logs" },
  { icon: Inbox, label: "Email Inbox", href: "/admin/inbox" },
  { icon: Activity, label: "Observability", href: "/admin/observability" },
  // ... more items
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Logo + Admin badge */}
        <div className="h-16 flex items-center px-6 border-b">
          <Logo />
          <Badge className="ml-2">Admin</Badge>
        </div>
        
        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>
      
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

---

## Section: Dashboard

### Purpose
Overview of key metrics with quick actions.

### Features
- Stats cards (Total Users, Subscribers, Revenue, Open Tickets)
- Recent signups list
- Quick action buttons (e.g., Refresh All Tokens)

### Implementation

```typescript
// src/pages/admin/AdminDashboard.tsx
export default function AdminDashboard() {
  const queryClient = useQueryClient();

  // Fetch aggregated stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, subs, messages] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("support_messages")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
      ]);
      
      return {
        totalUsers: users.count || 0,
        activeSubscribers: subs.count || 0,
        openMessages: messages.count || 0,
      };
    },
  });

  // Recent users query
  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Quick action mutation
  const refreshTokens = useMutation({
    mutationFn: () => supabase.functions.invoke("refresh-tokens", { body: { manual: true } }),
    onSuccess: () => toast.success("Tokens refreshed"),
  });

  return (
    <AdminLayout>
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Users" value={stats?.totalUsers} icon={Users} />
        <StatCard title="Subscribers" value={stats?.activeSubscribers} icon={CreditCard} />
        {/* ... more cards */}
      </div>
      
      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
```

---

## Section: Analytics

### Purpose
Visualize user growth, engagement, and resource usage over time.

### Features
- Time range selector (24h, 7d, 30d, 90d)
- User stats cards (Total, New, Active, Subscribers, Conversion Rate)
- Signup trend line chart
- Platform distribution pie chart
- Resource usage stats
- API usage with success/error rates

### Implementation

```typescript
// src/pages/admin/AdminAnalytics.tsx
export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState("7d");

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "24h": return { start: subHours(now, 24), end: now };
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      default: return { start: subDays(now, 7), end: now };
    }
  };

  const { start, end } = getDateRange();

  // User growth query
  const { data: userStats } = useQuery({
    queryKey: ["admin-user-stats", timeRange],
    queryFn: async () => {
      const [total, newUsers, activePosts, subs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start.toISOString()),
        supabase.from("posts").select("user_id").gte("created_at", start.toISOString()),
        supabase.from("user_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);
      
      return {
        totalUsers: total.count || 0,
        newUsers: newUsers.count || 0,
        activeUsers: new Set(activePosts.data?.map(p => p.user_id)).size,
        subscribers: subs.count || 0,
        conversionRate: ((subs.count || 0) / (total.count || 1) * 100).toFixed(1),
      };
    },
  });

  // Signup trend for chart
  const { data: signupTrend } = useQuery({
    queryKey: ["admin-signup-trend", timeRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", start.toISOString());

      // Group by day
      const days = eachDayOfInterval({ start, end });
      return days.map(day => ({
        date: format(day, "MMM d"),
        signups: data?.filter(u => {
          const d = new Date(u.created_at);
          return d >= startOfDay(day) && d <= endOfDay(day);
        }).length || 0,
      }));
    },
  });

  return (
    <AdminLayout>
      {/* Time Range Selector */}
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">Last 24 hours</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard title="Total Users" value={userStats?.totalUsers} />
        <StatCard title="New Users" value={userStats?.newUsers} trend="+12%" />
        {/* ... */}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Signup Trend */}
        <Card>
          <CardHeader>
            <CardTitle>User Signups</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformStats} dataKey="count" nameKey="platform" label>
                  {platformStats?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
```

---

## Section: Users

### Purpose
Comprehensive user management with search, filters, bulk actions.

### Features
- Search by email/name
- Filter by platform/plan
- Bulk select & actions (edit quotas, delete)
- Individual user quota editing
- Role management
- Sync quotas from Stripe

### Implementation

```typescript
// src/pages/admin/AdminUsers.tsx
export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editQuotaUser, setEditQuotaUser] = useState<UserWithRole | null>(null);

  // Fetch users with related data
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles, accounts, quotas, subs] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("social_accounts").select("*").eq("is_active", true),
        supabase.from("user_quotas").select("*"),
        supabase.from("user_subscriptions")
          .select("user_id, status, subscription_plans:plan_id(slug, name)")
          .in("status", ["active", "trialing"]),
      ]);

      return profiles.data?.map(profile => ({
        ...profile,
        role: roles.data?.find(r => r.user_id === profile.id)?.role || "user",
        social_accounts: accounts.data?.filter(a => a.user_id === profile.id) || [],
        quota: quotas.data?.find(q => q.user_id === profile.id),
        plan_slug: subs.data?.find(s => s.user_id === profile.id)?.subscription_plans?.slug || "free",
      }));
    },
    refetchInterval: 60000,
  });

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPlatform = platformFilter === "all" ||
        user.social_accounts?.some(a => a.platform === platformFilter);
      
      const matchesPlan = planFilter === "all" || user.plan_slug === planFilter;
      
      return matchesSearch && matchesPlatform && matchesPlan;
    });
  }, [users, searchQuery, platformFilter, planFilter]);

  // Update quota mutation
  const updateQuota = useMutation({
    mutationFn: async ({ userId, quota }) => {
      const { error } = await supabase
        .from("user_quotas")
        .upsert({ user_id: userId, ...quota });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Quota updated" });
    },
  });

  // Bulk delete mutation
  const bulkDelete = useMutation({
    mutationFn: async (userIds: string[]) => {
      for (const id of userIds) {
        await supabase.auth.admin.deleteUser(id);
      }
    },
    onSuccess: () => {
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <AdminLayout>
      {/* Search & Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          {/* Platform options */}
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          {/* Plan options */}
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={() => setShowBulkEditDialog(true)}>
            Edit Quotas ({selectedUsers.length})
          </Button>
          <Button variant="destructive" onClick={() => setShowBulkDeleteDialog(true)}>
            Delete ({selectedUsers.length})
          </Button>
        </div>
      )}

      {/* Users Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox /></TableHead>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Accounts</TableHead>
            <TableHead>Quotas</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked) => {
                    setSelectedUsers(prev => 
                      checked ? [...prev, user.id] : prev.filter(id => id !== user.id)
                    );
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar><AvatarImage src={user.avatar_url} /></Avatar>
                  <div>
                    <p className="font-medium">{user.full_name || "No name"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge>{user.plan_slug}</Badge>
              </TableCell>
              <TableCell>
                {user.social_accounts?.map(acc => (
                  <PlatformIcon key={acc.id} platform={acc.platform} />
                ))}
              </TableCell>
              <TableCell>
                <span>{user.quota?.posts_this_month || 0} / {user.quota?.max_posts_per_month}</span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger><MoreHorizontal /></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setEditQuotaUser(user)}>
                      Edit Quotas
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Quota Dialog */}
      <Dialog open={!!editQuotaUser} onOpenChange={() => setEditQuotaUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quotas for {editQuotaUser?.email}</DialogTitle>
          </DialogHeader>
          {/* Quota form fields */}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
```

---

## Section: Coupons

### Purpose
Create and manage discount codes.

### Features
- Create coupon (percentage or fixed amount)
- Set validity dates
- Set usage limits
- Toggle active status
- Copy code to clipboard
- Delete coupons

### Implementation

```typescript
// src/pages/admin/AdminCoupons.tsx
interface Coupon {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
}

export default function AdminCoupons() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_percent: "",
    discount_amount: "",
    valid_from: "",
    valid_until: "",
    max_uses: "",
    is_active: true,
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createCoupon = useMutation({
    mutationFn: async (coupon) => {
      const { error } = await supabase.from("coupons").insert([coupon]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon created" });
      setIsCreateOpen(false);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }) => {
      await supabase.from("coupons").update({ is_active }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id) => {
      await supabase.from("coupons").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const isExpired = (c: Coupon) => c.valid_until && new Date(c.valid_until) < new Date();
  const isMaxedOut = (c: Coupon) => c.max_uses && c.current_uses >= c.max_uses;

  return (
    <AdminLayout>
      <div className="flex justify-between">
        <h2>Coupons</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus /> Create Coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="SUMMER2024"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Discount %"
                  value={newCoupon.discount_percent}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    discount_percent: e.target.value,
                    discount_amount: "",
                  })}
                />
                <Input
                  type="number"
                  placeholder="Fixed Amount ($)"
                  value={newCoupon.discount_amount}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    discount_amount: e.target.value,
                    discount_percent: "",
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={newCoupon.valid_from} onChange={...} />
                <Input type="date" value={newCoupon.valid_until} onChange={...} />
              </div>
              <Input type="number" placeholder="Max uses (unlimited if empty)" />
              <Switch checked={newCoupon.is_active} onCheckedChange={...} />
            </div>
            <DialogFooter>
              <Button onClick={() => createCoupon.mutate(newCoupon)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Validity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => (
            <TableRow key={coupon.id}>
              <TableCell>
                <code className="bg-muted px-2 py-1 rounded">{coupon.code}</code>
                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(coupon.code)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </TableCell>
              <TableCell>
                {coupon.discount_percent ? `${coupon.discount_percent}% off` : `$${coupon.discount_amount} off`}
              </TableCell>
              <TableCell>{coupon.current_uses} / {coupon.max_uses || "∞"}</TableCell>
              <TableCell>
                {coupon.valid_until ? format(new Date(coupon.valid_until), "MMM d, yyyy") : "No expiry"}
              </TableCell>
              <TableCell>
                {isExpired(coupon) ? <Badge variant="destructive">Expired</Badge> :
                 isMaxedOut(coupon) ? <Badge>Maxed Out</Badge> :
                 coupon.is_active ? <Badge className="bg-green-500/10 text-green-600">Active</Badge> :
                 <Badge variant="secondary">Inactive</Badge>}
              </TableCell>
              <TableCell>
                <Switch
                  checked={coupon.is_active}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: coupon.id, is_active: checked })}
                />
                <Button variant="ghost" onClick={() => deleteCoupon.mutate(coupon.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminLayout>
  );
}
```

---

## Section: System Logs

### Purpose
Monitor edge function executions, token refreshes, and system events.

### Features
- Live mode (auto-refresh every 5s)
- Filter by category (token, edge, post, auth, system)
- Filter by level (error, warn, info, debug)
- Search logs
- Clear old logs
- Expandable metadata details

### Implementation

```typescript
// src/pages/admin/AdminLogs.tsx
const LOG_CATEGORIES = [
  { value: "all", label: "All Logs", icon: Globe },
  { value: "token", label: "Token Refresh", icon: Shield },
  { value: "edge", label: "Edge Functions", icon: Zap },
  { value: "post", label: "Posts", icon: Database },
  { value: "auth", label: "Authentication", icon: Shield },
  { value: "system", label: "System", icon: Globe },
];

export default function AdminLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [isLiveMode, setIsLiveMode] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-system-logs", selectedCategory, selectedLevel, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (selectedCategory !== "all") query = query.eq("category", selectedCategory);
      if (selectedLevel !== "all") query = query.eq("level", selectedLevel);
      if (searchQuery) query = query.or(`message.ilike.%${searchQuery}%,source.ilike.%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: isLiveMode ? 5000 : false,
  });

  const clearOldLogs = useMutation({
    mutationFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await supabase.from("system_logs").delete().lt("created_at", thirtyDaysAgo.toISOString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-logs"] });
      toast.success("Old logs cleared");
    },
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error": return <AlertCircle className="text-red-500" />;
      case "warn": return <AlertTriangle className="text-yellow-500" />;
      case "info": return <Info className="text-blue-500" />;
      default: return <CheckCircle className="text-green-500" />;
    }
  };

  return (
    <AdminLayout>
      {/* Header with Live Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2>System Logs</h2>
        <div className="flex items-center gap-3">
          <Switch checked={isLiveMode} onCheckedChange={setIsLiveMode} />
          <Label>Live Mode</Label>
          <Button onClick={() => refetch()}>Refresh</Button>
          <Button onClick={() => clearOldLogs.mutate()}>Clear Old</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent>Total: {logs.length}</CardContent></Card>
        <Card><CardContent className="text-red-500">Errors: {logs.filter(l => l.level === "error").length}</CardContent></Card>
        <Card><CardContent className="text-yellow-500">Warnings: {logs.filter(l => l.level === "warn").length}</CardContent></Card>
        <Card><CardContent className="text-blue-500">Info: {logs.filter(l => l.level === "info").length}</CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          {LOG_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
          ))}
        </Select>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="warn">Warning</SelectItem>
          <SelectItem value="info">Info</SelectItem>
        </Select>
      </div>

      {/* Log Entries */}
      <ScrollArea className="h-[500px]">
        {logs.map((log) => (
          <div key={log.id} className="p-4 border-b hover:bg-muted/50">
            <div className="flex items-start gap-3">
              {getLevelIcon(log.level)}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{log.level.toUpperCase()}</Badge>
                  <Badge variant="outline">{log.category}</Badge>
                  <code className="text-xs">{log.source}</code>
                </div>
                <p className="mt-1">{log.message}</p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer">View details</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </ScrollArea>
    </AdminLayout>
  );
}
```

---

## Section: Email Inbox

### Purpose
View and respond to emails sent to admin addresses.

### Features
- Threaded message view
- Compose new emails
- Reply/Forward emails
- Drafts management
- Scheduled emails
- Mark as read/unread
- Sync delivery statuses

### Implementation

```typescript
// src/components/admin/inbox/AdminInbox.tsx
type MessageFilter = "all" | "received" | "sent";

export function AdminInbox() {
  const composeRef = useRef<ComposeEmailRef>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    messages,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    syncDeliveryStatuses,
    refetch,
  } = useAdminInbox();

  // Filter messages
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (messageFilter === "received") filtered = filtered.filter(m => m.direction === "inbound");
    if (messageFilter === "sent") filtered = filtered.filter(m => m.direction === "outbound");
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.from_email.toLowerCase().includes(query) ||
        m.to_email.toLowerCase().includes(query) ||
        m.subject?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [messages, messageFilter, searchQuery]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="inbox">
            Inbox {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Select value={messageFilter} onValueChange={setMessageFilter}>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </Select>
          <ComposeEmail ref={composeRef} />
          <Button onClick={syncDeliveryStatuses}>Sync Status</Button>
          <Button onClick={markAllAsRead}>Mark All Read</Button>
        </div>
      </div>

      <TabsContent value="inbox">
        <Input
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-4 h-[600px]">
          {/* Thread List */}
          <div className="w-1/3 border rounded-lg overflow-hidden">
            <ThreadedMessageList
              messages={filteredMessages}
              selectedThreadId={selectedThread?.id}
              onSelectThread={(thread) => {
                setSelectedThread(thread);
                thread.messages.forEach(m => !m.is_read && markAsRead(m.id));
              }}
            />
          </div>
          {/* Thread Detail */}
          <div className="flex-1 border rounded-lg overflow-hidden">
            <ThreadDetail
              thread={selectedThread}
              onDelete={deleteMessage}
              onReply={(data) => composeRef.current?.openReply(data)}
              onForward={(data) => composeRef.current?.openForward(data)}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="drafts"><DraftsManager /></TabsContent>
      <TabsContent value="scheduled"><ScheduledEmailsManager /></TabsContent>
    </Tabs>
  );
}
```

### Sending Emails (Edge Function)

```typescript
// supabase/functions/send-admin-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  const { to, subject, html, from = "admin@postora.cloud", replyToId } = await req.json();

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);

  // Store in database
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabase.from("admin_inbox_messages").insert({
    from_email: from,
    to_email: to,
    subject,
    html_body: html,
    direction: "outbound",
    status: "sent",
    resend_id: data?.id,
    reply_to_id: replyToId,
  });

  return new Response(JSON.stringify({ success: true, id: data?.id }));
});
```

---

## Section: Observability

### Purpose
Monitor system health, configure alerts, track edge function performance.

### Features
- Health score dashboard (overall, functions, database, tokens)
- Health trend chart (24h)
- Edge function performance metrics (calls, success rate, duration)
- Alert configuration (create, toggle, delete)
- Alert history with resolve action
- Auto-refresh (30s)
- Slack + Email notifications

### Implementation

```typescript
// src/pages/admin/AdminObservability.tsx
const TRIGGER_TYPES = [
  { value: "error_rate", label: "Error Rate (%)", icon: AlertTriangle },
  { value: "response_time", label: "Response Time (ms)", icon: Timer },
  { value: "health_score", label: "Health Score", icon: Heart },
  { value: "token_health", label: "Token Health", icon: Zap },
];

const AUTO_REFRESH_INTERVAL = 30000;

export default function AdminObservability() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isAddAlertOpen, setIsAddAlertOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    trigger_type: "error_rate",
    threshold_value: 10,
    use_slack: false,
    slack_webhook_url: "",
  });

  // Fetch health snapshot
  const { data: latestHealth, refetch: refetchHealth } = useQuery({
    queryKey: ["observability-health-latest"],
    queryFn: async () => {
      setLastRefreshed(new Date());
      const { data } = await supabase
        .from("observability_health_snapshots")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
  });

  // Fetch health history for chart
  const { data: healthHistory = [] } = useQuery({
    queryKey: ["observability-health-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("observability_health_snapshots")
        .select("*")
        .gte("captured_at", subHours(new Date(), 24).toISOString())
        .order("captured_at", { ascending: true });
      return data;
    },
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
  });

  // Fetch function metrics
  const { data: functionMetrics = [] } = useQuery({
    queryKey: ["observability-function-metrics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("observability_metrics")
        .select("*")
        .eq("metric_type", "edge_function")
        .order("window_end", { ascending: false });

      // Aggregate by function name
      const metricsMap = new Map();
      for (const m of data || []) {
        const existing = metricsMap.get(m.metric_name);
        if (existing) {
          existing.total_calls += m.total_count;
          existing.success_count += m.success_count;
          existing.error_count += m.error_count;
        } else {
          metricsMap.set(m.metric_name, {
            function_name: m.metric_name,
            total_calls: m.total_count,
            success_count: m.success_count,
            error_count: m.error_count,
            avg_duration_ms: m.avg_duration_ms,
          });
        }
      }
      return Array.from(metricsMap.values());
    },
  });

  // Fetch alerts
  const { data: alertConfigs = [] } = useQuery({
    queryKey: ["observability-alert-configs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("observability_alert_configs")
        .select("*")
        .order("created_at", { ascending: false });
      return data;
    },
  });

  // Create alert mutation
  const createAlert = useMutation({
    mutationFn: async () => {
      const channels = ["email"];
      if (newAlert.use_slack) channels.push("slack");

      await supabase.from("observability_alert_configs").insert({
        name: newAlert.name,
        trigger_type: newAlert.trigger_type,
        threshold_value: newAlert.threshold_value,
        notification_channels: channels,
        webhook_url: newAlert.use_slack ? newAlert.slack_webhook_url : null,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observability-alert-configs"] });
      setIsAddAlertOpen(false);
    },
  });

  const getHealthColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <AdminLayout>
      {/* Header with Auto-Refresh Toggle */}
      <div className="flex justify-between items-center">
        <h2>Observability</h2>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Play /> : <Pause />}
            {autoRefresh ? "On" : "Off"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Last updated: {format(lastRefreshed, "HH:mm:ss")}
          </span>
          <Button onClick={() => refetchHealth()}>Refresh Now</Button>
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={getHealthBgColor(latestHealth?.overall_health_score)}>
          <CardContent>
            <div className={getHealthColor(latestHealth?.overall_health_score)}>
              <span className="text-3xl font-bold">{latestHealth?.overall_health_score || "--"}%</span>
            </div>
            <p className="text-sm">Overall Health</p>
          </CardContent>
        </Card>
        {/* Similar cards for functions, database, tokens */}
      </div>

      {/* Health Trend Chart */}
      <Card>
        <CardHeader><CardTitle>Health Trend (24h)</CardTitle></CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer>
            <AreaChart data={healthHistory.map(h => ({
              time: format(new Date(h.captured_at), "HH:mm"),
              overall: h.overall_health_score,
              functions: h.edge_functions_health,
            }))}>
              <Area dataKey="overall" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
              <Area dataKey="functions" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
              <Tooltip />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Edge Function Performance */}
      <Card>
        <CardHeader><CardTitle>Edge Function Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={functionMetrics}>
                <XAxis dataKey="function_name" />
                <YAxis />
                <Bar dataKey="success_count" stackId="a" fill="#22c55e" />
                <Bar dataKey="error_count" stackId="a" fill="#ef4444" />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Avg Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {functionMetrics.map((m) => (
                <TableRow key={m.function_name}>
                  <TableCell>{m.function_name}</TableCell>
                  <TableCell>{m.total_calls}</TableCell>
                  <TableCell>
                    <Badge className={m.success_count / m.total_calls >= 0.95 ? "bg-green-500" : "bg-red-500"}>
                      {((m.success_count / m.total_calls) * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{m.avg_duration_ms?.toFixed(0)}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <Dialog open={isAddAlertOpen} onOpenChange={setIsAddAlertOpen}>
            <DialogTrigger asChild>
              <Button><Plus /> Add Alert</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
              <Input
                placeholder="Alert name"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
              />
              <Select
                value={newAlert.trigger_type}
                onValueChange={(v) => setNewAlert({ ...newAlert, trigger_type: v })}
              >
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="Threshold"
                value={newAlert.threshold_value}
                onChange={(e) => setNewAlert({ ...newAlert, threshold_value: Number(e.target.value) })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={newAlert.use_slack}
                  onCheckedChange={(c) => setNewAlert({ ...newAlert, use_slack: c })}
                />
                <Label>Slack Notifications</Label>
              </div>
              {newAlert.use_slack && (
                <Input
                  placeholder="Slack Webhook URL"
                  value={newAlert.slack_webhook_url}
                  onChange={(e) => setNewAlert({ ...newAlert, slack_webhook_url: e.target.value })}
                />
              )}
              <DialogFooter>
                <Button onClick={() => createAlert.mutate()}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertConfigs.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>{alert.name}</TableCell>
                  <TableCell>{alert.trigger_type}</TableCell>
                  <TableCell>{alert.threshold_value}</TableCell>
                  <TableCell>
                    {alert.notification_channels.map(c => (
                      <Badge key={c} variant="outline">{c}</Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(checked) => toggleAlert.mutate({ id: alert.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" onClick={() => deleteAlert.mutate(alert.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
```

---

## Edge Functions Reference

### observability-collector
Aggregates metrics from system_logs and creates health snapshots.

```typescript
// supabase/functions/observability-collector/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 5 * 60 * 1000); // 5 minutes

  // Fetch recent logs
  const { data: logs } = await supabase
    .from("system_logs")
    .select("*")
    .gte("created_at", windowStart.toISOString());

  // Calculate health scores
  const errorCount = logs?.filter(l => l.level === "error").length || 0;
  const totalLogs = logs?.length || 0;
  const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;
  const overallHealth = Math.max(0, 100 - errorRate * 2);

  // Group by edge function for metrics
  const functionMetrics = new Map();
  logs?.filter(l => l.category === "edge").forEach(log => {
    const name = log.source;
    const existing = functionMetrics.get(name) || { success: 0, error: 0, durations: [] };
    if (log.level === "error") existing.error++;
    else existing.success++;
    if (log.metadata?.duration_ms) existing.durations.push(log.metadata.duration_ms);
    functionMetrics.set(name, existing);
  });

  // Store metrics
  for (const [name, metrics] of functionMetrics) {
    await supabase.from("observability_metrics").insert({
      metric_type: "edge_function",
      metric_name: name,
      total_count: metrics.success + metrics.error,
      success_count: metrics.success,
      error_count: metrics.error,
      avg_duration_ms: metrics.durations.length > 0
        ? metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length
        : null,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
    });
  }

  // Store health snapshot
  await supabase.from("observability_health_snapshots").insert({
    overall_health_score: Math.round(overallHealth),
    edge_functions_health: 100 - (functionMetrics.size > 0 ? /* calc */ 0 : 0),
    active_errors_count: errorCount,
  });

  return new Response(JSON.stringify({ success: true }));
});
```

### observability-alerts
Checks alert thresholds and sends notifications.

```typescript
// supabase/functions/observability-alerts/index.ts
serve(async (req) => {
  const supabase = createClient(/*...*/);
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  // Fetch active alerts
  const { data: alerts } = await supabase
    .from("observability_alert_configs")
    .select("*")
    .eq("is_active", true);

  // Fetch latest health
  const { data: health } = await supabase
    .from("observability_health_snapshots")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(1)
    .single();

  for (const alert of alerts || []) {
    let currentValue: number | null = null;
    
    switch (alert.trigger_type) {
      case "health_score":
        currentValue = health?.overall_health_score;
        break;
      case "error_rate":
        // Calculate from recent logs
        break;
    }

    if (currentValue === null) continue;

    // Check threshold
    const shouldTrigger = evaluateThreshold(currentValue, alert.threshold_operator, alert.threshold_value);
    
    if (shouldTrigger && canTrigger(alert)) {
      // Record alert
      await supabase.from("observability_alert_history").insert({
        alert_config_id: alert.id,
        alert_name: alert.name,
        trigger_type: alert.trigger_type,
        triggered_value: currentValue,
        threshold_value: alert.threshold_value,
        severity: currentValue < 50 ? "critical" : "warning",
      });

      // Send notifications
      if (alert.notification_channels.includes("email")) {
        await resend.emails.send({
          from: "admin@postora.cloud",
          to: alert.notification_emails,
          subject: `🚨 Alert: ${alert.name}`,
          html: `<p>Triggered at ${currentValue} (threshold: ${alert.threshold_value})</p>`,
        });
      }

      if (alert.notification_channels.includes("slack") && alert.webhook_url) {
        await fetch(alert.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attachments: [{
              color: "#ef4444",
              blocks: [
                { type: "header", text: { type: "plain_text", text: `🚨 Alert: ${alert.name}` } },
                { type: "section", fields: [
                  { type: "mrkdwn", text: `*Trigger:* ${alert.trigger_type}` },
                  { type: "mrkdwn", text: `*Value:* ${currentValue}` },
                ]},
              ],
            }],
          }),
        });
      }

      // Update last triggered
      await supabase
        .from("observability_alert_configs")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);
    }
  }

  return new Response(JSON.stringify({ success: true }));
});
```

---

## Component Patterns

### Reusable Stat Card
```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, icon: Icon, description, trend, trendUp }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <Badge variant="secondary" className={trendUp ? "text-green-600" : "text-red-600"}>
                {trend}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Data Table with Pagination
```typescript
function DataTable<T>({ data, columns, pageSize = 10 }: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const paginatedData = data.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(data.length / pageSize);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.key}>{col.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
```

---

## Security Best Practices

### 1. Role Verification
```typescript
// Always check admin role server-side via RLS policies
CREATE POLICY "Admins only" ON sensitive_table
  FOR ALL USING (has_role(auth.uid(), 'admin'));

// In Edge Functions, verify via JWT
const authHeader = req.headers.get("Authorization");
const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));
if (!user) throw new Error("Unauthorized");

// Check role
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "admin");

if (!roles?.length) throw new Error("Admin access required");
```

### 2. Never Store Roles on Profiles Table
```sql
-- ❌ BAD: Leads to privilege escalation
ALTER TABLE profiles ADD COLUMN role TEXT;

-- ✅ GOOD: Separate table with RLS
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### 3. Audit Logging
```typescript
// Log admin actions for accountability
async function logAdminAction(action: string, resourceType: string, resourceId?: string, details?: object) {
  await supabase.from("admin_audit_log").insert({
    admin_id: auth.uid(),
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
  });
}

// Usage
await logAdminAction("delete_user", "user", userId, { email: user.email });
```

### 4. Input Validation
```typescript
import { z } from "zod";

const CouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  discount_percent: z.number().min(1).max(100).nullable(),
  discount_amount: z.number().min(0.01).nullable(),
  valid_until: z.string().datetime().nullable(),
});

// Validate before insert
const validated = CouponSchema.parse(input);
await supabase.from("coupons").insert(validated);
```

---

## Cron Jobs Setup

```sql
-- Schedule observability collection every 5 minutes
SELECT cron.schedule(
  'observability-collector-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.postora.cloud/functions/v1/observability-collector',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJ..."}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);

-- Schedule alert checks every 5 minutes (offset by 1 minute)
SELECT cron.schedule(
  'observability-alerts-5min',
  '1-59/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.postora.cloud/functions/v1/observability-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJ..."}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);
```

---

## Summary

This guide covers the complete implementation of 7 admin dashboard sections:

| Section | Key Tables | Key Features |
|---------|------------|--------------|
| Dashboard | profiles, user_subscriptions, support_messages | Stats overview, recent signups, quick actions |
| Analytics | profiles, posts, social_accounts, api_logs | Charts, time ranges, user growth, platform distribution |
| Users | profiles, user_roles, user_quotas, social_accounts | Search, filters, bulk actions, quota editing |
| Coupons | coupons | CRUD, validity, usage tracking |
| System Logs | system_logs | Filtering, live mode, clear old logs |
| Email Inbox | admin_inbox_messages, email_drafts, scheduled_emails | Threads, compose, drafts, scheduling |
| Observability | observability_* tables | Health scores, function metrics, alerts, Slack |

All sections follow consistent patterns:
- TanStack Query for data fetching with `refetchInterval` for real-time updates
- shadcn/ui components for consistent UI
- RLS policies restricting access to admins
- Edge functions for complex backend operations
- Toast notifications for user feedback
