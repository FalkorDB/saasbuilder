import Image from "next/image";

import Button from "../Button/Button";
import { Text } from "../Typography/Typography";
import StatusChip from "../StatusChip/StatusChip";
import ClockIcon from "../Icons/ServicePlanCard/ClockIcon";
import CirclePlusIcon from "../Icons/ServicePlanCard/CirclePlusIcon";
import CircleCheckIcon from "../Icons/ServicePlanCard/CircleCheckIcon";
import ServicePlanCardIcon from "../Icons/ServicePlanCard/ServicePlanCardIcon";

import { colors } from "src/themeConfig";
import { SetState } from "src/types/common/reactGenerics";

import CardCircleBg from "./CardCircleBg.png";
import { Subscription } from "src/types/subscription";
import { SubscriptionRequest } from "src/types/subscriptionRequest";
import { Box } from "@mui/material";

type ServicePlanCardProps = {
  isSelected?: boolean;
  servicePlan: any;
  rootSubscription: Subscription;
  subscriptionRequest: SubscriptionRequest;
  setSelectedPlanId: SetState<string>;
  onSubscribeClick: () => void;
  onUnsubscribeClick: () => void;
  isSubscribing?: boolean;
  isUnsubscribing?: boolean;
  isFetchingData?: boolean;
};

const ServicePlanCard: React.FC<ServicePlanCardProps> = ({
  isSelected,
  servicePlan,
  rootSubscription,
  subscriptionRequest,
  setSelectedPlanId,
  onSubscribeClick,
  onUnsubscribeClick,
  isSubscribing,
  isUnsubscribing,
  isFetchingData,
}) => {
  const isAutoApprove = servicePlan.AutoApproveSubscription;
  const isUnsubscribeAllowed =
    !rootSubscription?.defaultSubscription &&
    rootSubscription?.roleType === "root";

  return (
    <Box
      onClick={() => setSelectedPlanId(servicePlan.productTierID)}
      className="overflow-hidden relative flex flex-col gap-3 items-center border border-[#E9EAEB] rounded-xl px-4 py-4 cursor-pointer"
      sx={{
        outline: isSelected ? `2px solid ${colors.purple700}` : "none",
        "& img": {
          opacity: isSelected ? "1" : "0",
        },
        "&:hover": {
          "& img": {
            opacity: "1",
          },
        },
      }}
    >
      <StatusChip
        sx={{
          position: "absolute",
          top: "20px",
          right: "12px",
        }}
        capitalize={false}
        color={isAutoApprove ? colors.lightBlue700 : colors.error700}
        bgColor={isAutoApprove ? colors.lightBlue50 : colors.error50}
        borderColor={isAutoApprove ? "#B2DDFF" : "#F9DBAF"}
        status={isAutoApprove ? "Auto Approval" : "Approval Required"}
      />

      <Image
        src={CardCircleBg}
        alt=""
        className="absolute"
        style={{
          top: "0px",
          left: "0px",
          transition: "opacity 0.3s ease-in-out",
        }}
      />

      <ServicePlanCardIcon />

      <div style={{ maxWidth: "100%", zIndex: 10 }}>
        <Text
          size="large"
          weight="semibold"
          color="#414651"
          sx={{
            textAlign: "center",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {servicePlan.productTierName}
        </Text>

        <Text
          size="small"
          weight="regular"
          color="#535862"
          sx={{
            textAlign: "center",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {servicePlan.productTierDescription}
        </Text>
      </div>

      {!rootSubscription && !subscriptionRequest && (
        <Button
          variant="contained"
          disabled={
            isFetchingData ||
            isSubscribing ||
            isUnsubscribing ||
            servicePlan.serviceModelStatus !== "READY"
          }
          startIcon={
            <CirclePlusIcon
              disabled={
                isFetchingData ||
                isSubscribing ||
                isUnsubscribing ||
                servicePlan.serviceModelStatus !== "READY"
              }
            />
          }
          onClick={onSubscribeClick}
          disabledMessage={
            servicePlan.serviceModelStatus !== "READY"
              ? "Service not available at the moment"
              : ""
          }
        >
          Subscribe
        </Button>
      )}

      {rootSubscription && isUnsubscribeAllowed && (
        <Button
          variant="outlined"
          disabled={isFetchingData || isSubscribing || isUnsubscribing}
          onClick={onUnsubscribeClick}
        >
          Unsubscribe
        </Button>
      )}

      {rootSubscription && !isUnsubscribeAllowed && (
        <Button
          variant="contained"
          disabled
          startIcon={<CircleCheckIcon />}
          disabledMessage={
            rootSubscription?.defaultSubscription
              ? "Cannot unsubscribe from Default subscription"
              : rootSubscription && rootSubscription?.roleType !== "root"
                ? "Cannot unsubscribe without Root access"
                : ""
          }
        >
          Subscribed
        </Button>
      )}

      {subscriptionRequest && !rootSubscription && (
        <Button variant="contained" disabled startIcon={<ClockIcon />}>
          Pending Approval
        </Button>
      )}
    </Box>
  );
};

export default ServicePlanCard;
