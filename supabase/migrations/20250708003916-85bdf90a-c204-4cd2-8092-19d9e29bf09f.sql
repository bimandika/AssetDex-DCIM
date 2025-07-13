-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Create policies for logo uploads - allow all authenticated users to upload/view
CREATE POLICY "Logo images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- Create settings table to store organization settings including logo
CREATE TABLE public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT,
  organization_name TEXT DEFAULT 'DCIMS',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for organization settings - allow all authenticated users to view/edit
CREATE POLICY "Anyone can view organization settings" 
ON public.organization_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update organization settings" 
ON public.organization_settings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert organization settings" 
ON public.organization_settings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default organization settings
INSERT INTO public.organization_settings (organization_name) VALUES ('DCIMS');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();