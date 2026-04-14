import { FC } from "react";
import { Stack } from "@mui/material";

import Button from "src/components/Button/Button";
import LoadingSpinnerSmall from "src/components/CircularProgress/CircularProgress";
import DataGridHeaderTitle from "src/components/Headers/DataGridHeaderTitle";
import RefreshWithToolTip from "src/components/RefreshWithTooltip/RefreshWithToolTip";
import AddIcon from "@mui/icons-material/Add";
import Tooltip from "src/components/Tooltip/Tooltip";

type UsersTableHeaderProps = {
  count: number;
  refetch: () => void;
  isRefetching: boolean;
  isMutating: boolean;
  onAddUser: () => void;
  status: string;
  canWrite: boolean;
};

const UsersTableHeader: FC<UsersTableHeaderProps> = ({
  count,
  refetch,
  isRefetching,
  isMutating,
  onAddUser,
  status,
  canWrite,
}) => {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      p="20px"
      borderBottom="1px solid #EAECF0"
    >
      <DataGridHeaderTitle
        title="Users"
        desc="Manage user access to your FalkorDB instance"
        count={count}
        units={{
          singular: "User",
          plural: "Users",
        }}
      />
      <Stack direction="row" alignItems="center" gap="12px" justifyContent="flex-end" flexGrow={1} flexWrap="wrap">
        <RefreshWithToolTip refetch={refetch} disabled={isRefetching} />
        {canWrite && (
          <Tooltip
            placement="top"
            isVisible={status !== "RUNNING" ? true : undefined}
            title="The instance must be running to manage users"
          >
            <span>
              <Button
                variant="outlined"
                sx={{
                  height: "40px !important",
                  padding: "10px 14px !important",
                }}
                startIcon={<AddIcon />}
                disabled={status !== "RUNNING" || isRefetching || isMutating}
                onClick={onAddUser}
              >
                Add User
                {isMutating && (
                  <LoadingSpinnerSmall sx={{ color: "#7F56D9", marginLeft: "12px" }} />
                )}
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
};

export default UsersTableHeader;
