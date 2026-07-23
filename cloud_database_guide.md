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
-- 1. Create INVENTORY table
CREATE TABLE public.inventory (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    stock NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_stock NUMERIC NOT NULL DEFAULT 0,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create MENU table
CREATE TABLE public.menu (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    inventory_id TEXT REFERENCES public.inventory(id) ON DELETE SET NULL,
    inventory_qty NUMERIC,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create EMPLOYEES table
CREATE TABLE public.employees (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create ATTENDANCE table
CREATE TABLE public.attendance (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
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

-- 5. Create SALES table
CREATE TABLE public.sales (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
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
    payment_method TEXT NOT NULL,
    cashier TEXT,
    whatsapp_number TEXT,
    synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Enable Row Level Security (RLS) or grant API permissions
-- (On Free tier projects, PostgREST requires permissions to perform upserts from client)
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access" ON public.sales FOR ALL USING (true) WITH CHECK (true);
```

4. Click **Run** in the top right. You should see a message saying "Success". Your cloud tables are now fully provisioned and ready for real-time traffic.

---

## Step 3: Copy Your API Connection Credentials
To hook your PortablePOS app to your Supabase project, you need the connection URL and the API access key:

1. Inside Supabase, click on the **Project Settings** (represented by a gear icon ⚙️ in the bottom left).
2. Go to the **API** section in the settings sidebar.
3. Locate the **Project API keys** and **Connection Info**:
   - **Project URL**: Copy the URL value under **`Project URL`** (e.g. `https://xxxx.supabase.co`). This goes into **Supabase Project URL** in the settings.
   - **Anon Key**: Copy the long JWT token value under **`anon public`** key. This goes into **Supabase Anon Key** in the settings.

---

## Step 4: Configure the Connection in PortablePOS
Now that you have your credentials:

1. Log in to PortablePOS as **Manager / Admin** (e.g. using `admin` / `admin123`).
2. Go to the **Settings** tab.
3. Enable **Cloud Sync** by checking the toggle button.
4. Input your credentials:
   - **Supabase Project URL**: Paste your Project URL.
   - **Supabase Anon Key**: Paste your Anon Key.
   - **Restaurant / Store ID (Tenant ID)**: Assign a unique lowercase text identifier for this branch (e.g., `deli_manhattan_5`, `rest_spicy_bites`).
5. Click **Save Connection**.
6. Click **Sync Now** to start the sync.
   - The app will automatically upload all existing local database items and import any data already present on Supabase matching your Restaurant ID.

---

## Multi-Device Terminal Synchronization
* **Shared Branching**: To connect multiple phones or tablets to the same restaurant database, configure them with the **exact same Supabase credentials** and the **exact same Restaurant ID**. They will immediately share transactions, menus, and employee credentials.
* **Separate Branches**: If you own multiple restaurants, you can use the same Supabase project but configure them with **different Restaurant IDs** (e.g., `rest_branch_1` and `rest_branch_2`). The databases will partition the data automatically so that terminal layouts do not conflict.

---

## Role-Based Access Control
PortablePOS restricts access to screens depending on the logged-in staff member's role:
* **Admin / Manager**: Full system access. Can edit/delete the menu, modify wholesale inventory stocks, add/remove/edit employees, inspect EOD/monthly sales reports, download backups, and configure database connections.
* **Server**: Exclusively restricted to the **POS (Tables map & checkout)** screen. Servers can select tables, place orders, modify active carts, and process e-bills. All other navigation paths, dashboards, stats, and settings are hidden from their viewport to maintain operational security.
* **Cashier**: Access to billing POS, wholesale stock checks, and attendance registers.
* **Chef**: Access to wholesale inventory stocks and attendance registers.
