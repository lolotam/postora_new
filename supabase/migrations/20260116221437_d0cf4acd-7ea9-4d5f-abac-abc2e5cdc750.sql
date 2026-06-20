-- Create email_drafts table for storing draft emails
CREATE TABLE public.email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  to_emails TEXT[] DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',
  subject TEXT,
  body TEXT,
  html_body TEXT,
  attachments JSONB DEFAULT '[]',
  reply_to_message_id UUID REFERENCES public.admin_inbox_messages(id) ON DELETE SET NULL,
  signature_id UUID REFERENCES public.email_signatures(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view their own drafts" 
ON public.email_drafts 
FOR SELECT 
USING (
  auth.uid() = admin_id AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can create their own drafts" 
ON public.email_drafts 
FOR INSERT 
WITH CHECK (
  auth.uid() = admin_id AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update their own drafts" 
ON public.email_drafts 
FOR UPDATE 
USING (
  auth.uid() = admin_id AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete their own drafts" 
ON public.email_drafts 
FOR DELETE 
USING (
  auth.uid() = admin_id AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_drafts_updated_at
BEFORE UPDATE ON public.email_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_email_drafts_admin_id ON public.email_drafts(admin_id);
CREATE INDEX idx_email_drafts_updated_at ON public.email_drafts(updated_at DESC);