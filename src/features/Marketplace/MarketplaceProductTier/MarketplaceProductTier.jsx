import { Box, Divider, Typography, styled } from "@mui/material";
import { useRouter } from "next/router";
import DashboardLayout from "src/components/DashboardLayout/DashboardLayout";
import useServiceOfferingById from "./hooks/useServiceOfferingById";
import LoadingSpinner from "src/components/LoadingSpinner/LoadingSpinner";
import ProductTiers from "src/features/ProductTiers/ProductTiers";
import useUserSubscriptions from "src/hooks/query/useUserSubscriptions";
import useProductTierRedirect from "./hooks/useProductTierRedirect";
import NoServiceFoundUI from "../components/NoServiceFoundUI";
import Head from "next/head";
import useSubscriptionRequests from "./hooks/useSubscriptionRequests";
import { useEffect, useMemo } from "react";
import useResourcesInstanceIds from "src/hooks/useResourcesInstanceIds";
import usePublicServiceOfferings from "../PublicServices/hooks/useOrgServiceOfferings";

function MarketplaceProductTier({ orgLogoURL, orgName }) {
  const router = useRouter();
  const { serviceId, environmentId } = router.query;

  const publicServicesOfferingsQuery = usePublicServiceOfferings();

  const { data: services } = publicServicesOfferingsQuery;

  const subscriptionsQuery = useUserSubscriptions();
  const {
    isLoading: isSubscriptionLoading,
    refetch: refetchSubscriptions,
    data: subscriptions = [],
  } = subscriptionsQuery;

  const freeTierService = useMemo(() => {
    return services?.find(
      (service) =>
        service.productTierID === "pt-phFY4aK6Cq" ||
        service.productTierID === "pt-m2FKdsSXSi"
    );
  }, [services]);

  const {
    data: resourceInstancesIds,
    isFetching: isResourceInstancesIdsFetching,
    isFetched: isResourceInstancesIdsFetched,
  } = useResourcesInstanceIds(
    freeTierService?.serviceProviderId,
    freeTierService?.serviceURLKey,
    freeTierService?.serviceAPIVersion,
    freeTierService?.serviceEnvironmentURLKey,
    freeTierService?.serviceModelURLKey,
    freeTierService?.productTierURLKey,
    [{ urlKey: "free", resourceId: "free" }],
    subscriptions[0]?.id
  );

  const filterOutFreeDedicatedTier = useMemo(
    () =>
      (isResourceInstancesIdsFetched &&
        resourceInstancesIds?.free?.length === 0) ||
      (!isResourceInstancesIdsFetched &&
        !isResourceInstancesIdsFetching &&
        !resourceInstancesIds?.free?.length),
    [
      isResourceInstancesIdsFetched,
      isResourceInstancesIdsFetching,
      resourceInstancesIds,
    ]
  );

  const serviceOfferingQuery = useServiceOfferingById(serviceId);
  const { data, isFetching } = serviceOfferingQuery;
  const serviceOfferingData = useMemo(() => {
    const offerings = {
      ...data,
      offerings: data?.offerings?.sort((a, b) =>
        a.productTierName < b.productTierName ? -1 : 1
      ),
    };
    if (filterOutFreeDedicatedTier) {
      offerings.offerings =
        offerings.offerings?.filter(
          (offering) =>
            offering.productTierID !== "pt-phFY4aK6Cq" &&
            offering.productTierID !== "pt-m2FKdsSXSi"
        ) ?? [];
    }
    return offerings;
  }, [data, filterOutFreeDedicatedTier]);

  const {
    data: subscriptionRequestsData,
    isLoading: isSubscriptionRequestLoading,
    refetch: refetchSubscriptionRequests,
  } = useSubscriptionRequests();

  const subscriptionRequests = subscriptionRequestsData?.subscriptionRequests;

  const { shouldDisplayNoServicesUI, shouldDisplayServiceNotFoundUI } =
    useProductTierRedirect({
      filterOutFreeDedicatedTier,
    });

  if (
    isResourceInstancesIdsFetched &&
    ((filterOutFreeDedicatedTier && data?.offerings?.length === 1) ||
      shouldDisplayServiceNotFoundUI ||
      shouldDisplayNoServicesUI)
  ) {
    return (
      <>
        <Head>
          <title>Service Plans</title>
        </Head>
        <DashboardLayout
          noSidebar
          marketplacePage
          serviceName={orgName}
          serviceLogoURL={orgLogoURL}
          noServicesAvailable={true}
        >
          <NoServiceFoundUI
            text={
              shouldDisplayNoServicesUI
                ? "No Service Found"
                : "Service Not Found"
            }
          />
        </DashboardLayout>
      </>
    );
  }
  
  return (
    <>
      <Head>
        <title>Service Plans</title>
      </Head>
      <DashboardLayout
        noSidebar
        marketplacePage
        serviceName={serviceOfferingData?.serviceName}
        serviceLogoURL={
          serviceOfferingData?.offerings?.[0]?.serviceLogoURL || orgLogoURL
        }
      >
        {!serviceId ||
        !environmentId ||
        isFetching ||
        isResourceInstancesIdsFetching ||
        isSubscriptionLoading ||
        isSubscriptionRequestLoading ? (
          <Box display="flex" justifyContent="center" mt="200px">
            <LoadingSpinner />
          </Box>
        ) : (
          <>
            <Title>{serviceOfferingData?.serviceName}</Title>
            <Divider />
            <Box mt="40px">
              <ProductTiers
                source="marketplace"
                serviceId={serviceId}
                environmentId={environmentId}
                serviceOfferingData={serviceOfferingData}
                subscriptionsData={subscriptions}
                refetchSubscriptions={refetchSubscriptions}
                subscriptionRequests={subscriptionRequests}
                refetchSubscriptionRequests={refetchSubscriptionRequests}
              />
            </Box>
          </>
        )}
      </DashboardLayout>
    </>
  );
}

export default MarketplaceProductTier;

export const Title = styled(Typography)(() => ({
  color: "#101828",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "32px",
  marginBottom: "10px",
}));
