import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import {
  AvatarSection,
  AccountInfoSection,
  TimezoneSection,
  PasswordSection,
  MFASection,
} from "@/components/profile";

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and security settings.
          </p>
        </div>

        {/* Avatar Section */}
        <AvatarSection
          userId={user.id}
          avatarUrl={profile?.avatar_url}
          fullName={profile?.full_name}
          onRefresh={refreshProfile}
        />

        {/* Account Info */}
        <AccountInfoSection
          email={user.email}
          fullName={profile?.full_name}
        />

        {/* Timezone */}
        <TimezoneSection
          userId={user.id}
          initialTimezone={profile?.preferred_timezone}
          onRefresh={refreshProfile}
        />

        {/* Password */}
        <PasswordSection userEmail={user.email} />

        {/* 2FA */}
        <MFASection />
      </div>
    </DashboardLayout>
  );
}
