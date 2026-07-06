-- SQL Schema for SPG/SPB Shift Sales and Stock Management App
-- You can run this directly in the Supabase SQL Editor.

-- 1. Table for sales records
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type VARCHAR(10) NOT NULL, -- 'Weekday' or 'Weekend'
  crew_name VARCHAR(50) NOT NULL,  -- 'SPB', 'SPG 1', 'SPG 2'
  package_name VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price_per_unit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index for querying sales by date and crew
CREATE INDEX IF NOT EXISTS idx_sales_date_crew ON sales(date, crew_name);

-- 2. Table for daily stock records
CREATE TABLE IF NOT EXISTS stock_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type VARCHAR(10) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  sisa_kemarin INTEGER NOT NULL DEFAULT 0,
  pengambilan VARCHAR(50) NOT NULL DEFAULT '0',
  total_pengambilan INTEGER NOT NULL DEFAULT 0,
  total_barang INTEGER NOT NULL DEFAULT 0,
  pemakaian INTEGER NOT NULL DEFAULT 0,
  sisa_akhir INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(date, item_name)
);

-- Index for stock records
CREATE INDEX IF NOT EXISTS idx_stock_records_date ON stock_records(date);

-- 3. Table for financial closing
CREATE TABLE IF NOT EXISTS financial_recap (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  shift_type VARCHAR(10) NOT NULL,
  modal_awal INTEGER NOT NULL DEFAULT 660000,
  uang_fisik INTEGER NOT NULL DEFAULT 0,
  uang_qris INTEGER NOT NULL DEFAULT 0,
  total_penjualan INTEGER NOT NULL DEFAULT 0,
  selisih INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
