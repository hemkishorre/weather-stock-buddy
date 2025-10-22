-- Allow suppliers to view profiles of vendors who have ordered from them
CREATE POLICY "Suppliers can view vendor profiles from their orders"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM orders
    JOIN wholesalers ON wholesalers.id = orders.wholesaler_id
    WHERE orders.vendor_id = profiles.id 
    AND wholesalers.user_id = auth.uid()
  )
);

-- Allow vendors to view profiles of suppliers they've ordered from
CREATE POLICY "Vendors can view supplier profiles from their orders"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM orders
    JOIN wholesalers ON wholesalers.id = orders.wholesaler_id
    WHERE wholesalers.user_id = profiles.id 
    AND orders.vendor_id = auth.uid()
  )
);