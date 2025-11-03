-- Create ENUM types that Prisma doesn't create automatically

-- IncidentType enum
DO $$ BEGIN
  CREATE TYPE incident_type AS ENUM (
    'TIROTEIO',
    'DISPAROS_OUVIDOS',
    'INCENDIO',
    'UTILIDADE_PUBLICA'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PropertyType enum
DO $$ BEGIN
  CREATE TYPE property_type AS ENUM (
    'APARTMENT',
    'HOUSE',
    'STUDIO',
    'KITCHENETTE',
    'LOFT',
    'PENTHOUSE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- BusinessContext enum
DO $$ BEGIN
  CREATE TYPE business_context AS ENUM (
    'RENT',
    'SALE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TrendDirection enum
DO $$ BEGIN
  CREATE TYPE trend_direction AS ENUM (
    'IMPROVING',
    'STABLE',
    'WORSENING'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ScraperStatus enum
DO $$ BEGIN
  CREATE TYPE scraper_status AS ENUM (
    'RUNNING',
    'SUCCESS',
    'PARTIAL_SUCCESS',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
