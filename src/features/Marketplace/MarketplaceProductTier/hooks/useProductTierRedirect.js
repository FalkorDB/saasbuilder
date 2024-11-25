import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useOrgServiceOfferings from "../../PublicServices/hooks/useOrgServiceOfferings";
import { getMarketplaceProductTierRoute } from "src/utils/route/access/accessRoute";
import { marketplaceServicePageTypes } from "../../constants/marketplaceServicePageTypes";

const useProductTierRedirect = (opts) => {
  const router = useRouter();
  const { serviceId, environmentId } = router.query;

  const [noServicesPresent, setNoServicesPresent] = useState(false);
  const [isClientRendered, setIsClientRendered] = useState(false);
  const [serviceNotFound, setServiceNotFound] = useState(false);

  const {
    data: serviceOfferingsData,
    isFetching: isFetchingServiceOfferings,
    isFetched: areServiceOfferingsFetched
  } =
    useOrgServiceOfferings({ refetchOnMount: false, filterOutFreeDedicatedTier: opts?.filterOutFreeDedicatedTier });

  useEffect(() => {
    setIsClientRendered(true);
  }, []);

  useEffect(() => {
    setServiceNotFound(false);
  }, [router.isReady, serviceId, environmentId]);

  useEffect(() => {
    if (
      areServiceOfferingsFetched &&
      isClientRendered &&
      router.isReady &&
      (!serviceId || !environmentId)
    ) {
      if (serviceOfferingsData?.length > 0) {
        let selectedServiceOffering;

        if (!serviceId
        ) {
          selectedServiceOffering = serviceOfferingsData.find(s => {
            if (opts.filterOutFreeDedicatedTier) {
              return s.productTierID !== "pt-phFY4aK6Cq" &&
                s.productTierID !== "pt-m2FKdsSXSi"
            }
            return true
          })
        } else {
          if (environmentId) {
            selectedServiceOffering = serviceOfferingsData.find(
              (el) =>
                el.serviceId === serviceId &&
                el.serviceEnvironmentID === environmentId
            );
          } else {
            selectedServiceOffering = serviceOfferingsData.find(
              (el) => el.serviceId === serviceId
            );
          }
        }

        if (!selectedServiceOffering) {
          setServiceNotFound(true);
        } else {
          if ((selectedServiceOffering.productTierID === "pt-phFY4aK6Cq" ||
            selectedServiceOffering.productTierID === "pt-m2FKdsSXSi") && opts?.filterOutFreeDedicatedTier) {
            return
          }

          router.replace(
            getMarketplaceProductTierRoute(
              selectedServiceOffering.serviceId,
              selectedServiceOffering.serviceEnvironmentID,
              marketplaceServicePageTypes.public
            )
          );
        }
      } else {
        setNoServicesPresent(true);
      }
    }
  }, [
    serviceId,
    environmentId,
    areServiceOfferingsFetched,
    isClientRendered,
    router,
    serviceOfferingsData,
    opts?.filterOutFreeDedicatedTier
  ]);

  return {
    serviceOfferingsData,
    isFetchingServiceOfferings,
    shouldDisplayNoServicesUI: noServicesPresent,
    shouldDisplayServiceNotFoundUI: serviceNotFound,
    isClientRendered: isClientRendered,
  };
};

export default useProductTierRedirect;
