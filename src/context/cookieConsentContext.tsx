import { createContext, ReactNode, Suspense, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import CookieConsentModal from "src/components/CookieConsent/CookieConsentModal";
import { getCookieConsentInitialObject, handleConsentChanges, syncHubSpotQueryChange, trackHubSpotPageView } from "src/cookieConsentManager";
import { getHubSpotScriptSrc } from "src/hubspotConfig";
import { CategoryWithoutServices, CookieConsent } from "src/types/cookieConsent";

type CookieConsentContextType = {
  consentState: CookieConsent;
  updateConsent: (updatedCategories: CategoryWithoutServices[]) => void;
  isConsentModalOpen: boolean;
  setIsConsentModalOpen: (isOpen: boolean) => void;
};

// Default value for context
const defaultContextValue: CookieConsentContextType = {
  consentState: getCookieConsentInitialObject() as CookieConsent,
  updateConsent: () => { },
  isConsentModalOpen: false,
  setIsConsentModalOpen: () => { },
};

export const CookieConsentContext = createContext<CookieConsentContextType>(defaultContextValue);

type CookieConsentProviderProps = {
  children: ReactNode;
  googleAnalyticsTagID: string | undefined;
};

// Isolated in its own component (wrapped in Suspense) so reading search params doesn't opt the whole app tree
// out of static rendering.
function SearchParamsWatcher({ onChange }: { onChange: (search: string) => void }) {
  const search = useSearchParams()?.toString() ?? "";
  useEffect(() => {
    onChange(search);
  }, [search, onChange]);
  return null;
}

export default function CookieConsentProvider({ children, googleAnalyticsTagID }: CookieConsentProviderProps) {
  const pathname = usePathname();
  const defaultCookieConsentObj = getCookieConsentInitialObject(googleAnalyticsTagID) as CookieConsent;
  const [consentState, setConsentState] = useState(
    defaultCookieConsentObj
  );
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const previousPathname = useRef<string | null>(null);
  const previousSearch = useRef<string | null>(null);
  const [search, setSearch] = useState<string | null>(null);

  const [isInitialLoad, setIsIntialLoad] = useState(true);

  // Runs only on the client after the first render
  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem("cookieConsent");
      let parsedConsent: CookieConsent | null = storedConsent ? JSON.parse(storedConsent) : null;

      if (parsedConsent) {

        if ((parsedConsent?.version ?? 0) < defaultCookieConsentObj.version) {
          // Non-editable categories keep their defaults. The analytics category now covers an additional
          // service (HubSpot) that the user never agreed to, so its opt-in is reset and the banner is shown again.
          parsedConsent = {
            ...defaultCookieConsentObj,
            consentGiven: false,
          };
        }
        // Sync presence/absence or change of GA measurement ID.
        const analyticsCategoryIndex = parsedConsent.categories.findIndex((c) => c.category === "analytics");
        const analyticsCategory = analyticsCategoryIndex >= 0 ? parsedConsent.categories[analyticsCategoryIndex] : null;
        const gaService = analyticsCategory?.services?.find((s) => s.name === "googletagmanager");

        const hubspotConfigured = Boolean(
          getHubSpotScriptSrc(process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID, process.env.NEXT_PUBLIC_HUBSPOT_REGION)
        );

        if (googleAnalyticsTagID || hubspotConfigured) {
          // An analytics service (GA and/or HubSpot) is configured now.
          if (!analyticsCategory) {
            // Add analytics category fresh.
            const newAnalytics = getCookieConsentInitialObject(googleAnalyticsTagID).categories.find(
              (c) => c.category === "analytics"
            );
            if (newAnalytics) {
              parsedConsent.categories.push(newAnalytics);
              // A category the user never saw (it was removed while nothing was configured) needs a fresh opt-in.
              parsedConsent.consentGiven = false;
            }
          } else if (gaService && gaService.gtag !== googleAnalyticsTagID) {
            gaService.gtag = googleAnalyticsTagID; // update id only; handlers unchanged
          }
        } else if (analyticsCategory) {
          // No analytics service configured anymore; remove analytics category entirely.
          parsedConsent.categories = parsedConsent.categories.filter((c) => c.category !== "analytics");
        }

        localStorage.setItem("cookieConsent", JSON.stringify(parsedConsent));
        handleConsentChanges(parsedConsent.categories);
        setConsentState(parsedConsent);
      } else {
        localStorage.setItem("cookieConsent", JSON.stringify(getCookieConsentInitialObject(googleAnalyticsTagID)));
      }
      if (!parsedConsent?.consentGiven) setIsConsentModalOpen(true);
    } catch {
      // swallow errors silently
    }
  }, [googleAnalyticsTagID]);

  useEffect(() => {
    // handle changes in consent state
    if (isInitialLoad) {
      setIsIntialLoad(false);
    } else {
      localStorage.setItem("cookieConsent", JSON.stringify(consentState));
      handleConsentChanges(consentState.categories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentState]);

  useEffect(() => {
    // usePathname() can be null (Pages Router fallback / pre-hydration); wait for a real value.
    if (!pathname) return;

    const prevPath = previousPathname.current;
    const prevSearch = previousSearch.current;
    previousPathname.current = pathname;
    if (search !== null) previousSearch.current = search;

    // The first values only establish the baseline: the loader's own initial pageview covers them.
    if (prevPath === null) return;

    const analyticsEnabled = consentState.categories.find((category) => category.category === "analytics")?.enabled;
    if (!analyticsEnabled) return;

    if (prevPath !== pathname) trackHubSpotPageView(pathname);
    else if (search !== null && prevSearch !== null && prevSearch !== search) syncHubSpotQueryChange(pathname);
  }, [consentState.categories, pathname, search]);

  const updateConsent = (updatedCategories: CategoryWithoutServices[]) => {
    const newCategories = consentState.categories.map((cat) => {
      const updatedCategory = updatedCategories.find((uc) => uc.category === cat.category);
      return updatedCategory ? { ...cat, enabled: updatedCategory.enabled } : cat;
    });
    setConsentState({
      ...consentState,
      categories: newCategories,
      consentGiven: true,
    });
  };

  return (
    <CookieConsentContext.Provider
      value={{
        consentState,
        updateConsent,
        isConsentModalOpen,
        setIsConsentModalOpen,
      }}
    >
      <Suspense fallback={null}>
        <SearchParamsWatcher onChange={setSearch} />
      </Suspense>
      {children}
      <CookieConsentModal />
    </CookieConsentContext.Provider>
  );
}

export const useCookieConsentContext = () => useContext(CookieConsentContext);
