import { PropertyType, BusinessContext } from '@prisma/client';

export interface PropertyData {
  qaListingId: string;
  qaUrl: string;

  // Location (required)
  neighborhood: string;
  municipality: string;
  state: string;
  latitude: number;
  longitude: number;

  // Optional fields
  address?: string;
  propertyType?: PropertyType;
  businessContext?: BusinessContext;
  price?: number; // in cents
  condominiumFee?: number;
  iptu?: number;
  totalArea?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  suiteCount?: number;
  parkingSlots?: number;
  isFurnished?: boolean;
  placesNearby?: Array<{
    name: string;
    type: string;
    slug: string;
  }>;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: ExtractionErrorCode,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export enum ExtractionErrorCode {
  INVALID_URL = 'INVALID_URL',
  FETCH_FAILED = 'FETCH_FAILED',
  MISSING_COORDINATES = 'MISSING_COORDINATES',
  PARSE_FAILED = 'PARSE_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
}
