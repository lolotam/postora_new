import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PostingHistory {
  platform: string;
  posted_at: string;
}

interface TimeSlot {
  day: string;
  hour: number;
  label: string;
  score: number;
  reason: string;
}

// Platform-specific best posting times (research-based defaults)
const PLATFORM_BEST_TIMES: Record<string, { days: number[]; hours: number[]; label: string }[]> = {
  facebook: [
    { days: [1, 2, 3, 4, 5], hours: [9, 10, 11], label: "Weekday mornings" },
    { days: [1, 2, 3, 4, 5], hours: [13, 14], label: "Weekday lunch" },
    { days: [3], hours: [12], label: "Wednesday noon peak" },
  ],
  instagram: [
    { days: [1, 2, 3, 4, 5], hours: [11, 12, 13], label: "Late morning" },
    { days: [2], hours: [11], label: "Tuesday 11am peak" },
    { days: [3, 4], hours: [10, 11], label: "Wed-Thu mid-morning" },
  ],
  tiktok: [
    { days: [2, 4], hours: [10, 11], label: "Tue/Thu mornings" },
    { days: [5], hours: [17, 18], label: "Friday evenings" },
    { days: [6], hours: [10, 11, 12], label: "Saturday mornings" },
  ],
  twitter: [
    { days: [1, 2, 3, 4, 5], hours: [8, 9, 10], label: "Weekday mornings" },
    { days: [3], hours: [9], label: "Wednesday 9am peak" },
    { days: [1, 2, 3, 4, 5], hours: [12], label: "Lunch break" },
  ],
  linkedin: [
    { days: [2, 3, 4], hours: [7, 8, 9], label: "Tue-Thu mornings" },
    { days: [2, 3], hours: [10, 11], label: "Tue-Wed mid-morning" },
    { days: [4], hours: [12], label: "Thursday lunch" },
  ],
  youtube: [
    { days: [5], hours: [15, 16, 17], label: "Friday afternoons" },
    { days: [6], hours: [9, 10, 11], label: "Saturday mornings" },
    { days: [4], hours: [14, 15], label: "Thursday afternoons" },
  ],
  pinterest: [
    { days: [6], hours: [20, 21, 22], label: "Saturday evenings" },
    { days: [5], hours: [15, 16], label: "Friday afternoons" },
    { days: [0], hours: [20, 21], label: "Sunday evenings" },
  ],
  threads: [
    { days: [1, 2, 3, 4, 5], hours: [11, 12, 13], label: "Late morning" },
    { days: [2, 4], hours: [10, 11], label: "Tue/Thu mornings" },
  ],
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function useSmartScheduling(platform: string | null) {
  const { user } = useAuth();

  // Fetch user's posting history for the platform
  const { data: history = [] } = useQuery({
    queryKey: ["posting-history", user?.id, platform],
    queryFn: async () => {
      if (!platform) return [];
      const { data, error } = await supabase
        .from("platform_posts")
        .select("platform, posted_at")
        .eq("platform", platform)
        .eq("status", "success")
        .order("posted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as PostingHistory[];
    },
    enabled: !!user && !!platform,
  });

  const suggestions = useMemo((): TimeSlot[] => {
    if (!platform) return [];

    const platformTimes = PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.facebook;
    const slots: TimeSlot[] = [];

    // Generate next 7 days of suggestions
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();

      for (const timeSlot of platformTimes) {
        if (timeSlot.days.includes(dayOfWeek)) {
          for (const hour of timeSlot.hours) {
            // Skip times in the past
            if (dayOffset === 0 && hour <= now.getHours()) continue;

            const score = 70 + Math.random() * 25; // Base score + variance
            slots.push({
              day: dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : DAY_NAMES[dayOfWeek],
              hour,
              label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
              score: Math.round(score),
              reason: timeSlot.label,
            });
          }
        }
      }
    }

    // Sort by score descending, take top 6
    return slots.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [platform, history]);

  return { suggestions, historyCount: history.length };
}
