import { Metadata } from "next";
import Script from "next/script";

import { ENVIRONMENT_TYPES } from "src/constants/environmentTypes";
import { getProviderOrgDetails } from "src/server/api/customer-user";
import { EnvironmentType } from "src/types/common/enums";
import { ProviderUser } from "src/types/users";
import RootProviders from "./RootProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: "FalkorDB",
  description: "FalkorDB - Ultra-fast, Multi-tenant Graph Database as a Service",
};

export const dynamic = "force-dynamic";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const providerOrgDetails: { data: ProviderUser } = await getProviderOrgDetails();

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="" id="provider-favicon" />
        {process.env.GOOGLE_ANALYTICS_TAG_ID && (
          <>
            <Script
              id="ga-loader"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.GOOGLE_ANALYTICS_TAG_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-init"
              src="/scripts/ga-init.js"
              strategy="afterInteractive"
              data-gtag-id={process.env.GOOGLE_ANALYTICS_TAG_ID}
            />
          </>
        )}
        <link rel="icon" href={undefined} id="provider-favicon" />
        <meta httpEquiv="cache-control" content="no-cache" />
        <meta httpEquiv="expires" content="0" />
        <meta httpEquiv="pragma" content="no-cache" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          // @ts-ignore
          crossOrigin="true"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RootProviders
          envType={(process.env.ENVIRONMENT_TYPE || ENVIRONMENT_TYPES.PROD) as EnvironmentType}
          providerOrgDetails={providerOrgDetails.data}
          googleAnalyticsTagID={process.env.GOOGLE_ANALYTICS_TAG_ID}
        >
          {children}
        </RootProviders>
      </body>
    </html>
  );
};

export default RootLayout;
