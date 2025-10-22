-- Create inventory needs table
CREATE TABLE public.inventory_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity_needed DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inventory_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory needs"
  ON public.inventory_needs FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Users can create own inventory needs"
  ON public.inventory_needs FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Users can update own inventory needs"
  ON public.inventory_needs FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE POLICY "Users can delete own inventory needs"
  ON public.inventory_needs FOR DELETE
  USING (auth.uid() = vendor_id);

-- Create trigger for timestamp updates
CREATE TRIGGER update_inventory_needs_updated_at
  BEFORE UPDATE ON public.inventory_needs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();