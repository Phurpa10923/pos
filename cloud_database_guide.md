# Cloud Database Setup Guide (Supabase Integration)

PortablePOS supports a fully cloud-based, multi-user operational flow. By connecting your local app to a free **Supabase** cloud database, you can synchronize your menu catalogs, wholesale inventory, sales logs, and employee rosters across multiple devices (phones, tablets, and computers) in real-time.

This guide provides step-by-step instructions to set up your free cloud database.

---

## Step 1: Create a Free Supabase Project
1. Go to [Supabase](https://supabase.com) and click **Start your project** or **Sign In**.
2. Sign in using your GitHub account or an Email.
3. Click **New Project** and select an Organization.
4. Fill in your project details:
   - **Name**: `PortablePOS`
   - **Database Password**: *Choose a secure password and save it somewhere.*
   - **Region**: Choose the server location closest to your restaurant.
   - **Pricing Plan**: Select the **Free Tier** (includes up to 500MB of storage and generous monthly API requests, which is more than enough for a standard restaurant).
5. Click **Create new project** and wait a couple of minutes for the database to be provisioned.

---

## Step 2: Initialize Database Tables
Once your project is ready, you need to create the tables to store your POS data. Supabase provides an easy SQL Editor for this:

1. Click on the **SQL Editor** tab (represented by a `SQL` symbol on the left sidebar navigation inside Supabase).
2. Click **New query** (or **Blank query**).
3. Copy and paste the following SQL script into the editor:

```sql
-- 1. Create RESTAURANTS registry table
CREATE TABLE public.restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CONSTRAINT chk_rest_status CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create INVENTORY table
CREATE TABLE public.inventory (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    stock NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_stock NUMERIC NOT NULL DEFAULT 0,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create MENU table
CREATE TABLE public.menu (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    inventory_id TEXT REFERENCES public.inventory(id) ON DELETE SET NULL,
    inventory_qty NUMERIC,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create EMPLOYEES table
CREATE TABLE public.employees (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CONSTRAINT chk_role CHECK (role IN ('Manager', 'Cashier', 'Server', 'Chef')),
    phone TEXT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CONSTRAINT chk_status CHECK (status IN ('active', 'inactive')),
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create ATTENDANCE table
CREATE TABLE public.attendance (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    clock_in TEXT,
    clock_in_raw TEXT,
    clock_out TEXT,
    clock_out_raw TEXT,
    duration TEXT,
    status TEXT,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create SALES table
CREATE TABLE public.sales (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    table_name TEXT,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax_type TEXT,
    tax_rate NUMERIC,
    tax_amount NUMERIC,
    tax_breakdown JSONB,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CONSTRAINT chk_payment CHECK (payment_method IN ('Cash', 'UPI', 'Split (Cash + UPI)')),
    cashier TEXT,
    whatsapp_number TEXT,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Enable Row Level Security (RLS) or grant API permissions
-- (On Free tier projects, PostgREST requires permissions to perform upserts from client)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable Realtime Replication for instant multi-device syncing
alter publication supabase_realtime add table public.restaurants;
alter publication supabase_realtime add table public.inventory;
alter publication supabase_realtime add table public.menu;
alter publication supabase_realtime add table public.employees;
alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.sales;
```

4. Click **Run** in the top right. You should see a message saying "Success". Your cloud tables are now fully provisioned and ready for real-time traffic.

---

## Step 3: Onboarding a New Restaurant / Tenant

To get a new restaurant branch or client ready to use your POS system, you need to add a record for them in the database:

### Part A: Register the Restaurant ID
1. In your Supabase dashboard, go to the **Table Editor** (spreadsheet icon).
2. Select the **`restaurants`** table.
3. Click **Insert row** and fill in:
   - **`id`**: Choose a unique lowercase text code for the branch (e.g. `royal_deli`, `pizza_palace_ny`).
   - **`name`**: The display name of the restaurant (e.g. `Royal Deli Manhattan`).
   - **`status`**: Must be **`active`**. (Set to `inactive` to suspend client POS access).
4. Click **Save**.

### Part B: Create their Admin staff account
1. Select the **`employees`** table.
2. Click **Insert row** and fill in:
   - **`id`**: e.g., `emp_admin_royal_deli` (or any unique ID).
   - **`restaurant_id`**: Enter the exact Restaurant ID you registered in Part A (e.g. `royal_deli`).
   - **`name`**: e.g. `Store Manager`.
   - **`role`**: Must be **`Manager`** (to allow them full access).
   - **`username`**: e.g. `admin`.
   - **`password`**: e.g. `admin123`.
   - **`status`**: Must be **`active`**.
   - **`synced`**: Must be **`true`**.
3. Click **Save**.

---

## Step 4: Connecting the Terminal (Client Setup)

Give the restaurant owner their unique **Restaurant ID**, along with their starting **Username** and **Password** (from Step 3).

1. In PortablePOS, click **"Connect Restaurant (Cloud)"** (or use the Cloud settings tab under Settings).
2. Input their **Restaurant ID**. (The Supabase Project URL and Anon Key are pre-configured centrally in the codebase!).
3. Input their **Username** and **Password**.
4. Click **Link & Login**.
5. The terminal instantly connects to their tenant, pulls their custom restaurant name, and establishes a secure sync session!
