import { FC, useMemo, useState } from "react";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { Collapse } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Button from "src/components/Button/Button";
import { Text } from "src/components/Typography/Typography";
import { useGlobalData } from "src/providers/GlobalDataProvider";
import { ConsumptionUsage as ConsumptionUsageData } from "src/types/consumption";

import useMultiSubscriptionUsage from "../hooks/useMultiSubscriptionUsage";
import {
  billingUsageDimensionFields,
  getEmptyBillingUsageTotals,
  getUsageDimensionTotals,
} from "../utils/usageDimensions";

import SubscriptionUsageTable, { SubscriptionUsageRow } from "./SubscriptionUsageTable";
import UsageDimensionCard from "./UsageDimensionCard";

dayjs.extend(utc);

type ConsumptionUsageProps = {
  // consumptionUsagePerDayData: ConsumptionUsagePerDay | undefined;
  consumptionUsageData: ConsumptionUsageData | undefined;
  // When set, the usage breakdown lives outside the dashboard (e.g. the Flexprice portal) and the button opens it
  onOpenUsageBreakdown?: () => void;
  isOpeningUsageBreakdown?: boolean;
};

const ConsumptionUsage: FC<ConsumptionUsageProps> = (props) => {
  const { consumptionUsageData, onOpenUsageBreakdown, isOpeningUsageBreakdown } = props;
  const [showUsageBreakdown, setShowUsageBreakdown] = useState(false);

  const aggregatedConsumptionDataHash = useMemo(() => {
    return getUsageDimensionTotals(consumptionUsageData?.usage || []);
  }, [consumptionUsageData]);

  const { subscriptions } = useGlobalData();

  const rootSubscriptions = useMemo(() => {
    return subscriptions
      .filter((subscription) => {
        return subscription.roleType === "root";
      })
      .sort((subscriptionA, subscriptionB) =>
        subscriptionA.productTierName.toLowerCase() < subscriptionB.productTierName.toLowerCase() ? -1 : 1
      );
  }, [subscriptions]);

  const subscriptionIds = useMemo(() => rootSubscriptions.map((subscription) => subscription.id), [rootSubscriptions]);

  const {
    data: subscriptionUsageHashmap,
    isFetched: isSubscriptionUsageFetched,
    isPending: isSubscriptionsUsagePending,
  } = useMultiSubscriptionUsage({
    // The inline breakdown isn't shown when it opens elsewhere, so skip the per-subscription requests
    subscriptionIds: onOpenUsageBreakdown ? [] : subscriptionIds,
  });

  const rows = useMemo(() => {
    let rows: SubscriptionUsageRow[] = [];
    if (isSubscriptionUsageFetched && subscriptionUsageHashmap) {
      rows = rootSubscriptions.map((subscription) => {
        const { id, serviceName, serviceLogoURL, productTierName, serviceId } = subscription;
        const usageData = subscriptionUsageHashmap[id] || getEmptyBillingUsageTotals();
        const rowData: SubscriptionUsageRow = {
          subscriptionId: id,
          serviceId: serviceId,
          ...usageData,
          serviceName: serviceName,
          subscriptionPlanName: productTierName,
          serviceLogoURL: serviceLogoURL,
        };
        return rowData;
      });
    }

    return rows;
  }, [isSubscriptionUsageFetched, subscriptionUsageHashmap, rootSubscriptions]);

  return (
    <div className="mt-[20px]">
      <div className="pb-2 pt-4 border-b border-[#E9EAEB]">
        <div className="flex flex-row items-center justify-between">
          <div>
            <Text size="medium" weight="semibold" color="#181D27">
              Current Usage
            </Text>
            <Text size="xsmall" weight="regular" color="#535862">
              Usage This Month{" "}
              {consumptionUsageData?.endTime &&
                `(Until ${dayjs.utc(consumptionUsageData?.endTime).format("MMM DD, YYYY, HH:mm:ss")} UTC)`}
            </Text>
          </div>
          {onOpenUsageBreakdown ? (
            <Button
              variant="outlined"
              onClick={onOpenUsageBreakdown}
              disabled={isOpeningUsageBreakdown}
              isLoading={isOpeningUsageBreakdown}
              fontColor={"#5925DC"}
              outlineColor={"#5925DC"}
              endIcon={!isOpeningUsageBreakdown && <ArrowOutwardIcon sx={{ fontSize: "18px" }} />}
            >
              Show Usage Breakdown
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={() => {
                setShowUsageBreakdown((prev) => !prev);
              }}
              fontColor={"#5925DC"}
              outlineColor={"#5925DC"}
            >
              {showUsageBreakdown ? "Hide" : "Show"} Usage Breakdown
            </Button>
          )}
        </div>
      </div>
      <div className=" py-3">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {billingUsageDimensionFields.map((field) => (
            <UsageDimensionCard
              key={field.dimension}
              title={field.title}
              dimensionName={field.dimension}
              value={aggregatedConsumptionDataHash[field.rowField]}
            />
          ))}
        </div>
      </div>
      <Collapse in={showUsageBreakdown && !onOpenUsageBreakdown}>
        <SubscriptionUsageTable rows={rows} isSubscriptionsUsagePending={isSubscriptionsUsagePending} />
      </Collapse>
    </div>
  );
};

export default ConsumptionUsage;
