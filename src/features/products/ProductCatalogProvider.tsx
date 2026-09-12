import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  loadProductCatalogService,
  type CatalogSnapshot,
  type ProductCatalogService,
  type ProductCatalogSource,
} from "../../services/product-catalog";

const emptyCatalog: CatalogSnapshot = { groups: [], workshops: [] };

type ProductCatalogContextValue = Readonly<{
  service: ProductCatalogService | null;
  source: ProductCatalogSource | null;
  catalog: CatalogSnapshot;
  loading: boolean;
  error: string | null;
  revision: number;
  refreshCatalog: (mutation?: boolean) => Promise<void>;
}>;

const ProductCatalogContext = createContext<ProductCatalogContextValue | null>(null);

export function ProductCatalogProvider({ children, service: suppliedService }: { children: ReactNode; service?: ProductCatalogService }) {
  const [service, setService] = useState<ProductCatalogService | null>(suppliedService ?? null);
  const [catalog, setCatalog] = useState<CatalogSnapshot>(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      setLoading(true);
      try {
        const resolved = suppliedService ?? await loadProductCatalogService();
        await resolved.initialize();
        const nextCatalog = await resolved.loadCatalog();
        if (!active) return;
        setService(resolved);
        setCatalog(nextCatalog);
        setError(null);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "بارگذاری اطلاعات محصولات ناموفق بود.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void bootstrap();
    return () => { active = false; };
  }, [suppliedService]);

  const refreshCatalog = useCallback(async (mutation = false) => {
    if (!service) return;
    const nextCatalog = await service.loadCatalog();
    setCatalog(nextCatalog);
    setError(null);
    if (mutation) setRevision(current => current + 1);
  }, [service]);

  const value = useMemo<ProductCatalogContextValue>(() => ({
    service,
    source: service?.source ?? null,
    catalog,
    loading,
    error,
    revision,
    refreshCatalog,
  }), [catalog, error, loading, refreshCatalog, revision, service]);

  return <ProductCatalogContext.Provider value={value}>{children}</ProductCatalogContext.Provider>;
}

export function useProductCatalog(): ProductCatalogContextValue {
  const value = useContext(ProductCatalogContext);
  if (!value) throw new Error("useProductCatalog must be used inside ProductCatalogProvider");
  return value;
}
