-- Add user_id to wholesalers table to link suppliers
ALTER TABLE public.wholesalers 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for wholesalers
DROP POLICY IF EXISTS "Anyone can view wholesalers" ON public.wholesalers;

CREATE POLICY "Anyone can view wholesalers"
ON public.wholesalers
FOR SELECT
USING (true);

CREATE POLICY "Suppliers can insert own wholesaler"
ON public.wholesalers
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'supplier'));

CREATE POLICY "Suppliers can update own wholesaler"
ON public.wholesalers
FOR UPDATE
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'supplier'));

-- Update RLS policies for products
CREATE POLICY "Suppliers can insert own products"
ON public.products
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.wholesalers 
  WHERE wholesalers.id = products.wholesaler_id 
  AND wholesalers.user_id = auth.uid()
));

CREATE POLICY "Suppliers can update own products"
ON public.products
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.wholesalers 
  WHERE wholesalers.id = products.wholesaler_id 
  AND wholesalers.user_id = auth.uid()
));

CREATE POLICY "Suppliers can delete own products"
ON public.products
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.wholesalers 
  WHERE wholesalers.id = products.wholesaler_id 
  AND wholesalers.user_id = auth.uid()
));

-- Update RLS policies for orders - allow suppliers to view orders placed to them
CREATE POLICY "Suppliers can view orders to them"
ON public.orders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.wholesalers 
  WHERE wholesalers.id = orders.wholesaler_id 
  AND wholesalers.user_id = auth.uid()
));

-- Update RLS policies for order_items - allow suppliers to view order items for their orders
CREATE POLICY "Suppliers can view order items for their orders"
ON public.order_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders 
  JOIN public.wholesalers ON wholesalers.id = orders.wholesaler_id
  WHERE orders.id = order_items.order_id 
  AND wholesalers.user_id = auth.uid()
));

-- Create trigger function to create wholesaler entry for suppliers
CREATE OR REPLACE FUNCTION public.handle_supplier_wholesaler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has supplier role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role = 'supplier'
  ) THEN
    INSERT INTO public.wholesalers (
      user_id, 
      name, 
      location, 
      contact_phone,
      delivery_time_hours
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Store'),
      COALESCE(NEW.raw_user_meta_data->>'location', 'Location not set'),
      NEW.email,
      2
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to call the function after user creation
DROP TRIGGER IF EXISTS on_supplier_create_wholesaler ON auth.users;
CREATE TRIGGER on_supplier_create_wholesaler
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supplier_wholesaler();