-- MULTI-PROJECT E-COMMERCE CRM SCHEMA V3 (Includes Advanced CRM Features)

-- 1. CLEANUP OLD TABLES
DROP TABLE IF EXISTS public.saved_views CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- 2. USERS
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    global_role TEXT DEFAULT 'staff' CHECK (global_role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PROJECTS
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website_url TEXT,
    webhook_secret TEXT,
    income_rule_type TEXT DEFAULT 'fixed_pack' CHECK (income_rule_type IN ('fixed_pack', 'percentage')), -- NEW: Rule selection
    income_percentage NUMERIC DEFAULT 10,         -- NEW: e.g. 10%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROJECT MEMBERS
CREATE TABLE public.project_members (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'viewer')),
    PRIMARY KEY (project_id, user_id)
);

-- 5. CUSTOMERS
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    lifetime_orders INT DEFAULT 0,
    lifetime_spent NUMERIC DEFAULT 0,             -- NEW: Tracking LTV
    tags TEXT[] DEFAULT '{}',                     -- NEW: VIP, Pack 10 Lover, etc.
    internal_notes TEXT,
    last_order_date TIMESTAMP WITH TIME ZONE,     -- Used to calculate 'days_since_last_order'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, email)
);

-- 6. ORDERS
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash')),
    total_price NUMERIC DEFAULT 0,
    shipping_fee NUMERIC DEFAULT 0,
    paypal_fee NUMERIC DEFAULT 0,
    total_income NUMERIC DEFAULT 0,
    manual_adjustment NUMERIC DEFAULT 0,          -- NEW: For partial refunds or discounts
    products_summary JSONB DEFAULT '[]'::jsonb,
    utm_source TEXT,                              -- NEW: LTV Tracking
    utm_medium TEXT,                              -- NEW: LTV Tracking
    utm_campaign TEXT,                            -- NEW: LTV Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, order_number)   
);

-- 7. SAVED VIEWS (NEW: For saving complex filters)
CREATE TABLE public.saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                           -- e.g., "Khách VIP sắp ngủ quên"
    view_type TEXT NOT NULL CHECK (view_type IN ('customers', 'orders')),
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. EXPENSES (Phí Vận Hành)
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'VND', 'AUD')),
    exchange_rate NUMERIC DEFAULT 1,              -- Tỷ giá quy đổi ra USD
    amount_usd NUMERIC NOT NULL,                  -- Số tiền chi phí chuẩn theo USD để trừ vào Income
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. DEMO DATA SETUP
INSERT INTO public.users (id, email, full_name, global_role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User', 'admin');

INSERT INTO public.projects (id, name, website_url) 
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'Shop Demo', 'https://demoshop.com');

INSERT INTO public.project_members (project_id, user_id, role) 
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000001', 'owner');

-- 10. RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow pub write users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow pub write projects" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow pub write members" ON public.project_members FOR ALL USING (true);
CREATE POLICY "Allow pub write customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow pub write orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow pub write saved views" ON public.saved_views FOR ALL USING (true);
CREATE POLICY "Allow pub write expenses" ON public.expenses FOR ALL USING (true);
