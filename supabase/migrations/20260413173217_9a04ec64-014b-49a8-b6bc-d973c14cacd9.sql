
-- 1. WhatsApp Contacts
CREATE TABLE public.whatsapp_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  company TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number)
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.whatsapp_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON public.whatsapp_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.whatsapp_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.whatsapp_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_contacts_user_id ON public.whatsapp_contacts(user_id);
CREATE INDEX idx_whatsapp_contacts_phone ON public.whatsapp_contacts(user_id, phone_number);
CREATE INDEX idx_whatsapp_contacts_tags ON public.whatsapp_contacts USING GIN(tags);

-- 2. WhatsApp Contact Groups
CREATE TABLE public.whatsapp_contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups" ON public.whatsapp_contact_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own groups" ON public.whatsapp_contact_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own groups" ON public.whatsapp_contact_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups" ON public.whatsapp_contact_groups FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_whatsapp_contact_groups_updated_at BEFORE UPDATE ON public.whatsapp_contact_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. WhatsApp Contact Group Members (join table)
CREATE TABLE public.whatsapp_contact_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.whatsapp_contact_groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, contact_id)
);

ALTER TABLE public.whatsapp_contact_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own group members" ON public.whatsapp_contact_group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.whatsapp_contact_groups g WHERE g.id = group_id AND g.user_id = auth.uid())
);
CREATE POLICY "Users can add to own groups" ON public.whatsapp_contact_group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.whatsapp_contact_groups g WHERE g.id = group_id AND g.user_id = auth.uid())
);
CREATE POLICY "Users can remove from own groups" ON public.whatsapp_contact_group_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.whatsapp_contact_groups g WHERE g.id = group_id AND g.user_id = auth.uid())
);

CREATE INDEX idx_whatsapp_group_members_group ON public.whatsapp_contact_group_members(group_id);
CREATE INDEX idx_whatsapp_group_members_contact ON public.whatsapp_contact_group_members(contact_id);

-- 4. WhatsApp Message Analytics
CREATE TABLE public.whatsapp_message_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_received INTEGER NOT NULL DEFAULT 0,
  templates_sent INTEGER NOT NULL DEFAULT 0,
  conversations_opened INTEGER NOT NULL DEFAULT 0,
  avg_response_time_minutes NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, social_account_id, date)
);

ALTER TABLE public.whatsapp_message_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON public.whatsapp_message_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON public.whatsapp_message_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analytics" ON public.whatsapp_message_analytics FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_whatsapp_analytics_user_date ON public.whatsapp_message_analytics(user_id, date);
