-- Create admin inbox messages table for email communications
-- This stores inbound emails received via Resend webhooks and outbound replies

CREATE TABLE public.admin_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  to_email text NOT NULL,
  subject text,
  body text,
  html_body text,
  message_type text NOT NULL DEFAULT 'email',
  direction text NOT NULL DEFAULT 'inbound',
  status text NOT NULL DEFAULT 'received',
  is_read boolean NOT NULL DEFAULT false,
  admin_id uuid REFERENCES auth.users(id),
  resend_id text,
  reply_to_id uuid REFERENCES public.admin_inbox_messages(id),
  thread_id uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_admin_inbox_messages_created_at ON public.admin_inbox_messages(created_at DESC);
CREATE INDEX idx_admin_inbox_messages_is_read ON public.admin_inbox_messages(is_read) WHERE is_read = false;
CREATE INDEX idx_admin_inbox_messages_status ON public.admin_inbox_messages(status);
CREATE INDEX idx_admin_inbox_messages_direction ON public.admin_inbox_messages(direction);
CREATE INDEX idx_admin_inbox_messages_thread_id ON public.admin_inbox_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_admin_inbox_messages_from_email ON public.admin_inbox_messages(from_email);
CREATE INDEX idx_admin_inbox_messages_to_email ON public.admin_inbox_messages(to_email);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_admin_inbox_messages_updated_at
  BEFORE UPDATE ON public.admin_inbox_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.admin_inbox_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can access inbox messages
CREATE POLICY "Admins can view all inbox messages"
  ON public.admin_inbox_messages
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert inbox messages"
  ON public.admin_inbox_messages
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inbox messages"
  ON public.admin_inbox_messages
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inbox messages"
  ON public.admin_inbox_messages
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Also allow service role to insert (for webhook handler)
CREATE POLICY "Service role can insert messages"
  ON public.admin_inbox_messages
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for admin inbox messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_inbox_messages;

-- Add comment for documentation
COMMENT ON TABLE public.admin_inbox_messages IS 'Stores inbound and outbound admin email messages via Resend integration';