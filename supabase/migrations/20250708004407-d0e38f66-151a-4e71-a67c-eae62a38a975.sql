-- Create enums for the property options
CREATE TYPE public.device_type AS ENUM ('Server', 'Storage', 'Network');
CREATE TYPE public.allocation_type AS ENUM ('IAAS/PAAS', 'SAAS', 'Load Balancer', 'Database');
CREATE TYPE public.environment_type AS ENUM ('Production', 'Testing', 'Pre-Production', 'Development');

-- Create servers table for inventory management
CREATE TABLE public.servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostname TEXT NOT NULL,
  device_type device_type NOT NULL,
  dc_site TEXT NOT NULL,
  dc_building TEXT,
  dc_floor TEXT,
  dc_room TEXT,
  allocation allocation_type,
  environment environment_type,
  ip_address TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  specifications JSONB,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Create policies for servers
CREATE POLICY "Anyone can view servers" 
ON public.servers 
FOR SELECT 
USING (true);

CREATE POLICY "Engineers can insert servers" 
ON public.servers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'engineer'::user_role));

CREATE POLICY "Engineers can update servers" 
ON public.servers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'engineer'::user_role));

CREATE POLICY "Super admins can delete servers" 
ON public.servers 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'super_admin'::user_role));

-- Create indexes for better performance
CREATE INDEX idx_servers_device_type ON public.servers(device_type);
CREATE INDEX idx_servers_dc_site ON public.servers(dc_site);
CREATE INDEX idx_servers_environment ON public.servers(environment);
CREATE INDEX idx_servers_status ON public.servers(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_servers_updated_at
BEFORE UPDATE ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create property definitions table for dynamic properties
CREATE TABLE public.property_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  property_type TEXT NOT NULL, -- 'text', 'select', 'number', 'boolean'
  options JSONB, -- For select types, stores the available options
  required BOOLEAN DEFAULT false,
  default_value TEXT,
  description TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for property definitions
ALTER TABLE public.property_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies for property definitions
CREATE POLICY "Anyone can view property definitions" 
ON public.property_definitions 
FOR SELECT 
USING (true);

CREATE POLICY "Engineers can manage property definitions" 
ON public.property_definitions 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'engineer'::user_role));

-- Insert default property definitions
INSERT INTO public.property_definitions (name, display_name, property_type, options, required, category, sort_order) VALUES
('device_type', 'Device Type', 'select', '["Server", "Storage", "Network"]', true, 'Hardware', 1),
('dc_site', 'DC Site', 'text', null, true, 'Location', 2),
('dc_building', 'DC Building', 'text', null, false, 'Location', 3),
('dc_floor', 'DC Floor', 'text', null, false, 'Location', 4),
('dc_room', 'DC Room', 'text', null, false, 'Location', 5),
('allocation', 'Allocation', 'select', '["IAAS/PAAS", "SAAS", "Load Balancer", "Database"]', false, 'Service', 6),
('environment', 'Environment', 'select', '["Production", "Testing", "Pre-Production", "Development"]', false, 'Service', 7),
('ip_address', 'IP Address', 'text', null, false, 'Network', 8),
('serial_number', 'Serial Number', 'text', null, false, 'Hardware', 9),
('manufacturer', 'Manufacturer', 'text', null, false, 'Hardware', 10),
('model', 'Model', 'text', null, false, 'Hardware', 11);

-- Create trigger for property definitions
CREATE TRIGGER update_property_definitions_updated_at
BEFORE UPDATE ON public.property_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();