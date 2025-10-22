-- Add weather location fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weather_latitude DECIMAL(10, 8) DEFAULT 40.7128,
ADD COLUMN IF NOT EXISTS weather_longitude DECIMAL(11, 8) DEFAULT -74.0060,
ADD COLUMN IF NOT EXISTS weather_location_name TEXT DEFAULT 'New York, NY';