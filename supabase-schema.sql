-- 1. Create Tables

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lowest_price NUMERIC(10, 2) NOT NULL,
  image TEXT NOT NULL
);

CREATE TABLE product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supermarket TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  availability TEXT NOT NULL -- 'OP VOORRAAD', 'BEPERKT', 'UITVERKOCHT'
);

CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  validity TEXT NOT NULL,
  image TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  official_buy NUMERIC(10, 2) NOT NULL,
  official_sell NUMERIC(10, 2) NOT NULL,
  street_buy NUMERIC(10, 2) NOT NULL,
  street_sell NUMERIC(10, 2) NOT NULL,
  change NUMERIC(5, 2) NOT NULL,
  symbol TEXT NOT NULL
);

-- 2. Seed Data

-- Products
INSERT INTO products (id, name, lowest_price, image) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Zonnebloemolie 1L', 85.50, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSeW-oDMCfdeY-WL8qFqdUOj3ig2dqnbJscRSLUhOQ3nrYEIdIBdm-rGHDfpJ-0iUf9O8g9s044pEbBgEdWGlxQgA6ou8AOqky1D6xfgNf9AmC6_d7B60lMjyvTqtYYeN4jubp3yWvJiO0exXEkYSnuJRvlBoWIkH_cN7E3E6_pvuRyXUAxwWXMl8GGr5c2b4LKielClInPaHZwmlYUJr9GrAa-PCZpYAUE_2TxF6p0dZF8Ux02POoa3U0-hkT06Kb_WnE6-dzgvxb'),
  ('22222222-2222-2222-2222-222222222222', 'Witte Rijst 5kg', 210.00, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvsTxeaCUh2cbL--Q5tfX-R3rOkLPTNq9G5SVDYKovPMq3o7x7dYHoOyTgWA1Ek_y1fwKgU9NUQOGd7jbdGLGZDn6zRCQ3gmYeUfFYfM_vPNjNK-EADrZk57xb2ZoUMkm0AOuFl9HF0x0jdkPD7DwQnWnWnPwSvHe3ircjJIqDj9FnTosthrK4sT9F8dLnbo0aMsApYUUI9djOYIKLWJiBaKTB2wNGCowAd5XQqr9t06PeI1eR_RBbQZ3uQQXgNe8sKYmK_2MLTK04'),
  ('33333333-3333-3333-3333-333333333333', 'Hele Kip (Per kg)', 112.50, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBktlMal7c42VZcYJJaBdy9VvRDmu18IxyZPwsF3jnB-bFf9fTzDuOiv1u_1OsrwFmLx3Shxmnm1qw6fddZWQHUlR8k9W8qucEdss3f5PQ53rEHNXpyrr6uymxWDosdg5J4Nj_Opo-1Dgzsu42rkB86tOYvlxSylBVSh_zGevBFwZDFHe3u-KbYRHbANMOk3izEAtZNi5vkGc7uLfFt06hdsPUAcn6lBQMlQiCBwGOidgQ-C_I72SDDYSaqD0HEorJ6FKyCP4U0U71'),
  ('44444444-4444-4444-4444-444444444444', 'Eieren (Tray 30 st)', 145.00, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNkNeqCwghl0Nnukv0yhPn0wmEvqHNL6BCv8wmjiJZ8XZlhOjOH6zXV_7ESTfZkhuhiNBOBGyZalFPDYiu2EuVN0RzPndAxbouPaUYmwCVKtGAptkQurxchaSiijgwsUEPibwLgwOBqJhuCdDb_D7hYyJif9vGqNaQqgaNB0di5xGX0KpjELh5c0epHV3Kn63hb1CqzwUcqm7ODYhKo7wAbKS214NgMJT7b7odaum6VESN_Q6clvuU8Eba8XQVvCOw_yL1w9svEka5');

-- Product Prices
INSERT INTO product_prices (product_id, supermarket, price, availability) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Choi''s', 85.50, 'OP VOORRAAD'),
  ('11111111-1111-1111-1111-111111111111', 'Tulip', 87.25, 'OP VOORRAAD'),
  ('11111111-1111-1111-1111-111111111111', 'Lucky Store', 89.90, 'BEPERKT'),
  
  ('22222222-2222-2222-2222-222222222222', 'Choi''s', 210.00, 'OP VOORRAAD'),
  ('22222222-2222-2222-2222-222222222222', 'Tulip', 215.00, 'OP VOORRAAD'),
  
  ('33333333-3333-3333-3333-333333333333', 'Best Mart', 112.50, 'OP VOORRAAD'),
  ('33333333-3333-3333-3333-333333333333', 'Choi''s', 115.00, 'BEPERKT'),
  
  ('44444444-4444-4444-4444-444444444444', 'Tulip', 145.00, 'OP VOORRAAD'),
  ('44444444-4444-4444-4444-444444444444', 'Lucky Store', 148.00, 'OP VOORRAAD');

-- Folders
INSERT INTO folders (id, name, validity, image, sort_order) VALUES
  ('55555555-5555-5555-5555-555555555555', 'Tulip Supermarkt', 'Geldig t/m 30 Mei', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeFc3_OMsLZ32lWbXh4jx2OWkeYn4HLx0hEGnR3QUq1Xj7ZdcGqr2mYYXCB3ZBPwBTYR_hALgwEKhUJ51LdeMpKer8kmpa8VpW5wpLVjPdNchYV_GJsajdo3jAIrgfHnazTR0amJLJR3H3qgizgVwR6l4fq07pL1yL5EvAA4nuSgwzRentZiTCtLDLKfZyr7RgUciJB8utmi2orPHfTeSWlPZO-jDQE8BnoAyTd4ak6dXe2-CawhrjPYXBGar3PQwmsGk-E2gjkDHQ', 1),
  ('66666666-6666-6666-6666-666666666666', 'Choi''s North', 'Geldig t/m 28 Mei', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBO-YxEEYf38pYLBFEWLTy90khmCPAOo_syMuvw4XcpsfwhaD6gwZCXyXxSM9N6ZSoDsTv6TGkC3sqKSVX6iUgLrVFbmOKaZcnfKSXdz7zO3eud2JsNTKN6KibTV9K0FIZU3ACM0_2FVtgPB4NPTkZTwjtkrThXTZOYW2c0DRzsA9WdRcczZni7XC3GAR62Z7brjbIoY2GUWaW-aekE8w3qQOMroCP2ARQSPICIW2wpBP1HCoETu2bmz6kBrU2Zz5woCkTKEFf3k5Vt', 2),
  ('77777777-7777-7777-7777-777777777777', 'Combé Markt', 'Geldig t/m Morgen', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLzeweTIujBK7yUH2D89BVVn_x4_wKYVwvkAKBex-BvqAfWV1ynZUqYqbWEhhr9hqdmydu7nylFXmofhDaM2vY1mgTRZH26--qoT_vsv9fWUCe9hJNQpouzmLf2HkjoUFJdVFgcwyrppOKiGCxsVOxVIaDpfz5msqLUMEYMNmgJ4y_hXumiAyjeftQjkp70BXf9h5qatzWdBa5JUtX4brczRUd0SKY1ehHnCx49_TevxGaRNB9YVXZn4uaoBZT4ak7GPJL9wulR9py', 3),
  ('88888888-8888-8888-8888-888888888888', 'Best Mart', 'Geldig t/m 1 Juni', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLgzHE1-wezmwJJ2-2cEWLQzbeEa9l1nuIfzYFGsjZb0k-B87rDGXNQ0nQVhEdPrxj8TSuq4wjNe6dgxNF0zI3GXod-lpenLCD9f7sNY1EI0NA53hj-VSLNUB6AlAGfOGI0wC59JaIiHwbFQeBemE3cSHvIRqk9R7VCPlaqso3d_LftWzOf5HWlYBj-JMwgUrGWY-e9qCw3m3iYdQzAcex4LTmh0FAAw0NJFmjTHfJ7AaxhOM9QGF1U9cSWfGATi3RWdbrolXWx0XM', 4);

-- Exchange Rates
INSERT INTO exchange_rates (pair, full_name, official_buy, official_sell, street_buy, street_sell, change, symbol) VALUES
  ('USD / SRD', 'Amerikaanse Dollar', 38.15, 38.55, 38.90, 39.45, 0.25, '$'),
  ('EUR / SRD', 'Europese Euro', 41.20, 41.60, 42.05, 42.60, -0.12, '€');

-- 3. User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL DEFAULT 'Gebruiker',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  language TEXT DEFAULT 'NL',
  dark_mode BOOLEAN DEFAULT false,
  rate_alerts BOOLEAN DEFAULT true,
  folder_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default profile
INSERT INTO user_profiles (id, display_name, email, phone, avatar_url) VALUES
  ('99999999-9999-9999-9999-999999999999', 'Arthur Wang', 'arthur@example.com', '+597 8000000', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCI6Pd1nnoofvkgxmCx5cKIlNJsQRbdZ94z8hnJP2GCJ_4w_R3NDHdwz2zDVp0WVN3io5mThp1C3v0mNwKtteCw8a85uQcF-AkqJrX2xkh6-mVa12JrGBe4fwR-8pyqImrjA_xr21H0pOVNJLBwq6GGU4hDFNqs6MWw2xJCa7xNsQRJGVUsM093K8xjU1g-800zeebvaGvoL7ElTWR6DdRCXZ0BLwSoNWhjuz8fAn-xoHGIZRxYMZ4XjfxiVPKINKc-svdM0KDPPM33');
