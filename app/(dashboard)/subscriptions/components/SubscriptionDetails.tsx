"use client";

import { useMemo } from "react";
import formatDateUTC from "src/utils/formatDateUTC";

import StatusChip from "components/StatusChip/StatusChip";
import DetailsTable from "components/DetailsTable/DetailsTable";
import GridCellExpand from "components/GridCellExpand/GridCellExpand";
import ServicePlanDetails from "components/ServicePlanDetails/ServicePlanDetails";
import ServiceNameWithLogo from "components/ServiceNameWithLogo/ServiceNameWithLogo";
import SubscriptionTypeDirectIcon from "components/Icons/SubscriptionType/SubscriptionTypeDirectIcon";
import SubscriptionTypeInvitedIcon from "components/Icons/SubscriptionType/SubscriptionTypeInvitedIcon";

const SubscriptionDetails = ({ subscription, serviceOfferingsObj }) => {
  const columns = useMemo(
    () => [
      {
        title: "Service Name",
        content: (
          <ServiceNameWithLogo
            serviceName={subscription?.serviceName}
            serviceLogoURL={subscription?.serviceLogoURL}
          />
        ),
      },
      {
        title: "Role",
        content: subscription?.roleType
          ? subscription.roleType.charAt(0).toUpperCase() +
            subscription.roleType.slice(1)
          : "-",
      },
      {
        title: "Service Plan",
        content: subscription?.productTierName || "-",
      },
      {
        title: "Status",
        content: <StatusChip status={subscription?.status} />,
      },
      {
        title: "Subscription Date",
        content: subscription?.createdAt
          ? formatDateUTC(subscription.createdAt)
          : "-",
      },
      {
        title: "Subscription Owner",
        content: (
          <GridCellExpand
            value={subscription?.subscriptionOwnerName}
            startIcon={
              subscription?.roleType === "root" ? (
                <SubscriptionTypeDirectIcon />
              ) : (
                <SubscriptionTypeInvitedIcon />
              )
            }
          />
        ),
      },
    ],
    [subscription]
  );

  if (!subscription) return null;
  const selectedPlan =
    serviceOfferingsObj[subscription.serviceId]?.[subscription.productTierId];

  return (
    <>
      <DetailsTable columns={columns} />
      <div className="mt-6">
        <ServicePlanDetails serviceOffering={selectedPlan} />
      </div>
    </>
  );
};

export default SubscriptionDetails;
