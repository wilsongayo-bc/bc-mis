import { createContext } from 'react';

export interface BrandingContextValue {
  logoUrl: string | null;
  schoolName: string;
  schoolMotto: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);