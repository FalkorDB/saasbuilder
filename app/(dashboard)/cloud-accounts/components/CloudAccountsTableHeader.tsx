import { FC } from "react";
import AddIcon from "@mui/icons-material/Add";
import { CircularProgress } from "@mui/material";

import ConnectIcon from "src/components/Icons/Connect/Connect";
import DisconnectIcon from "src/components/Icons/Disconnect/Disconnect";
import OffboardIcon from "src/components/Icons/Offboard/Offboard";
import { AccountConfig } from "src/types/account-config";
import { ResourceInstance } from "src/types/resourceInstance";
import Button from "components/Button/Button";
import SearchInput from "components/DataGrid/SearchInput";
import DataGridHeaderTitle from "components/Headers/DataGridHeaderTitle";
import DeleteIcon from "components/Icons/Delete/Delete";
import RefreshWithToolTip from "components/RefreshWithTooltip/RefreshWithToolTip";

type CloudAccountTableHeaderProps = {
  count: number;
  searchText: string;
  setSearchText: (text: string) => void;
  onCreateClick: () => void;
  onDeleteClick: () => void;
  selectedInstance: ResourceInstance;
  refetchInstances: () => void;
  isFetchingInstances: boolean;
  onConnectClick: () => void;
  onDisconnectClick: () => void;
  onOffboardClick?: () => void;
  serviceModelType: string;
  accountConfig: AccountConfig;
  isSelectedInstanceReadyToOffboard: boolean;
  isFetchingAccountConfigs: boolean;
};

const CloudAccountsTableHeader: FC<CloudAccountTableHeaderProps> = ({
  count,
  searchText,
  setSearchText,
  onCreateClick,
  onDeleteClick,
  selectedInstance,
  refetchInstances,
  isFetchingInstances,
  isFetchingAccountConfigs,
  onConnectClick,
  onDisconnectClick,
  serviceModelType,
  onOffboardClick,
  isSelectedInstanceReadyToOffboard,
}) => {
  const isDeploying = selectedInstance?.status === "DEPLOYING";
  const isAttaching = selectedInstance?.status === "ATTACHING";
  const isConnecting = selectedInstance?.status === "CONNECTING";
  const isDisconnected = selectedInstance?.status === "DISCONNECTED";

  const isOnPremCopilot = serviceModelType === "ON_PREM_COPILOT";
  const isReady = selectedInstance?.status === "READY";
  const isDisconnecting = selectedInstance?.status === "DISCONNECTING";

  const isDetaching = selectedInstance?.status === "DETACHING";
  const isPendingDetaching = selectedInstance?.status === "PENDING_DETACHING";
  const isDeleting = selectedInstance?.status === "DELETING";

  const isDisconnectDisabled =
    !selectedInstance || isAttaching || isConnecting || isDisconnected || isDeploying || !isOnPremCopilot;

  const isConnectDisabled =
    !selectedInstance ||
    isReady ||
    isDisconnecting ||
    isDetaching ||
    isPendingDetaching ||
    isDeploying ||
    !isOnPremCopilot;

  const isDeleteDisabled = !selectedInstance || isDeleting || isDisconnected;

  const isOffboardDisabled = !isSelectedInstanceReadyToOffboard;

  const isDisconnectDisabledMessage = !selectedInstance
    ? "Please select a cloud account"
    : isAttaching || isConnecting
      ? "Cloud account is connecting"
      : isDisconnected
        ? "Cloud account is disconnected"
        : isDeploying
          ? "Please wait for the instance to get to Ready state"
          : !isOnPremCopilot
            ? "This feature is not supported for this plan"
            : "";
  const isConnectDisabledMessage = !selectedInstance
    ? "Please select a cloud account"
    : isReady
      ? "Cloud account is already connected"
      : isDisconnecting || isDetaching || isPendingDetaching
        ? "Cloud account is disconnecting"
        : isDeploying
          ? "Please wait for the instance to get to Ready state"
          : !isOnPremCopilot
            ? "This feature is not supported for this plan"
            : "";

  const isDeleteDisabledMessage = !selectedInstance
    ? "Please select a cloud account"
    : isDeleting
      ? "Cloud account deletion is already in progress"
      : isDisconnected
        ? "Cloud account is disconnected"
        : "";

  const offboardingDisabledMessage = !selectedInstance
    ? "Please select a cloud account"
    : isOffboardDisabled
      ? "Cloud account is not ready to offboard"
      : "";

  return (
    <div className="py-5 px-6 flex items justify-between gap-4">
      <DataGridHeaderTitle
        title="List of Cloud Accounts"
        desc="Details of cloud account instances"
        count={count}
        units={{
          singular: "Account",
          plural: "Accounts",
        }}
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center mr-6">{isFetchingInstances && <CircularProgress size={20} />}</div>

        <SearchInput placeholder="Search by ID" searchText={searchText} setSearchText={setSearchText} />
        <RefreshWithToolTip refetch={refetchInstances} disabled={isFetchingInstances || isFetchingAccountConfigs} />

        <Button
          data-testid="delete-button"
          variant="outlined"
          disabled={isDeleteDisabled}
          onClick={onDeleteClick}
          startIcon={<DeleteIcon disabled={isDeleteDisabled} />}
          disabledMessage={isDeleteDisabledMessage}
        >
          Delete
        </Button>
        <Button
          data-testid="offboard-button"
          variant="outlined"
          disabled={isOffboardDisabled}
          onClick={onOffboardClick}
          disabledMessage={offboardingDisabledMessage}
          startIcon={<OffboardIcon disabled={isOffboardDisabled} />}
        >
          Offboard
        </Button>
        <Button
          data-testid="disconnect-button"
          variant="outlined"
          disabled={isDisconnectDisabled}
          onClick={onDisconnectClick}
          startIcon={<DisconnectIcon disabled={isDisconnectDisabled} />}
          disabledMessage={isDisconnectDisabledMessage}
        >
          Disconnect
        </Button>
        <Button
          data-testid="connect-button"
          variant="outlined"
          disabled={isConnectDisabled}
          onClick={onConnectClick}
          startIcon={<ConnectIcon disabled={isConnectDisabled} />}
          disabledMessage={isConnectDisabledMessage}
        >
          Connect
        </Button>
        <Button data-testid="create-button" variant="contained" onClick={onCreateClick} startIcon={<AddIcon />}>
          Create
        </Button>
      </div>
    </div>
  );
};

export default CloudAccountsTableHeader;
