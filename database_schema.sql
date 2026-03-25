-- CRM Leads Table Schema

DROP TABLE IF EXISTS public.leads CASCADE;

CREATE TABLE public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    time_label TEXT DEFAULT 'Just now',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    badge_label TEXT,
    badge_color TEXT CHECK (badge_color IN ('orange', 'blue', 'cyan', 'gray')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demonstration (UPDATE THESE IN PRODUCTION)
CREATE POLICY "Allow public read access" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.leads FOR DELETE USING (true);

-- Insert dummy data
INSERT INTO public.leads (name, email, phone, time_label, status, badge_label, badge_color)
VALUES 
    ('Andrew Peterson', 'andrew.@example.com', '603 555-0123', 'Today 10:30PM', 'pending', 'In Process', 'orange'),
    ('Brooklyn Simmons', 'tim@example.com', '239 555-0108', 'Today 10:30PM', 'processing', 'Dead', 'blue'),
    ('Leslie Alexander', 'sara.cruz@example.com', '308 555-0111', 'Today 10:30PM', 'completed', 'Recycled', 'cyan'),
    ('Jacob Jones', 'andrew.@example.com', '684 555-0102', 'Today 10:30PM', 'cancelled', 'In Process', 'orange');
