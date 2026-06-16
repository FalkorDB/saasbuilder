import { FC } from "react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { Stack } from "@mui/material";
import { UseMutationResult } from "@tanstack/react-query";

import type { RDBExportTarget, RDBImportSource } from "src/api/falkordb";
import Button from "src/components/Button/Button";
import LoadingSpinnerSmall from "src/components/CircularProgress/CircularProgress";
import DataGridHeaderTitle from "src/components/Headers/DataGridHeaderTitle";
import ExportIcon from "src/components/Icons/Export/ExportIcon";
import ImportIcon from "src/components/Icons/Import/ImportIcon";
import RefreshWithToolTip from "src/components/RefreshWithTooltip/RefreshWithToolTip";
import Tooltip from "src/components/Tooltip/Tooltip";

type TasksTableHeaderProps = {
  count: number;
  refetch: () => void;
  isRefetching: boolean;
  exportMutation: UseMutationResult<void, Error, { target?: RDBExportTarget }, unknown>;
  importMutation: UseMutationResult<void, Error, { file?: ArrayBuffer; source?: RDBImportSource }, unknown>;
  openDialog: (params: { open: boolean; type: "import" | "export" | "schedules" }) => void;
  isSchedulesAvailable: boolean;
  schedulesUnavailableReason?: string;
  status: string;
};

const TasksTableHeader: FC<TasksTableHeaderProps> = ({
  count,
  refetch,
  isRefetching,
  exportMutation,
  importMutation,
  openDialog,
  isSchedulesAvailable,
  schedulesUnavailableReason,
  status,
}) => {
  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p="20px"
        borderBottom="1px solid #EAECF0"
      >
        <DataGridHeaderTitle
          title={`List of tasks`}
          desc="Import and export RDBs to/from your FalkorDB instance"
          count={count}
          units={{
            singular: "Task",
            plural: "Tasks",
          }}
        />
        <Stack direction="row" alignItems="center" gap="12px" justifyContent="flex-end" flexGrow={1} flexWrap={"wrap"}>
          <RefreshWithToolTip refetch={refetch} disabled={isRefetching} />
          <Tooltip placement="top" visible={!isSchedulesAvailable} title={schedulesUnavailableReason || ""}>
            <span>
              <Button
                variant="outlined"
                sx={{
                  height: "40px !important",
                  padding: "10px 14px !important",
                }}
                startIcon={<CalendarMonthIcon />}
                disabled={!isSchedulesAvailable || isRefetching || importMutation.isPending || exportMutation.isPending}
                onClick={() => openDialog({ open: true, type: "schedules" })}
              >
                Schedules
              </Button>
            </span>
          </Tooltip>
          <Tooltip placement="top" visible={status !== "RUNNING"} title="The instance must be running to import an RDB">
            <span>
              <Button
                variant="outlined"
                sx={{
                  height: "40px !important",
                  padding: "10px 14px !important",
                }}
                startIcon={
                  <ImportIcon
                    disabled={
                      status != "RUNNING" || isRefetching || importMutation.isPending || exportMutation.isPending
                    }
                  />
                }
                disabled={status != "RUNNING" || isRefetching || importMutation.isPending || exportMutation.isPending}
                onClick={() => openDialog({ open: true, type: "import" })}
              >
                Import RDB
                {(importMutation.isPending || exportMutation.isPending) && (
                  <LoadingSpinnerSmall sx={{ color: "#7F56D9", marginLeft: "12px" }} />
                )}
              </Button>
            </span>
          </Tooltip>
          <Tooltip
            placement="top"
            visible={status !== "RUNNING"}
            title="The instance must be running to export the RDB"
          >
            <span>
              <Button
                variant="outlined"
                sx={{
                  height: "40px !important",
                  padding: "10px 14px !important",
                }}
                startIcon={
                  <ExportIcon
                    disabled={
                      status != "RUNNING" || isRefetching || exportMutation.isPending || importMutation.isPending
                    }
                  />
                }
                disabled={status != "RUNNING" || isRefetching || exportMutation.isPending || importMutation.isPending}
                onClick={() => openDialog({ open: true, type: "export" })}
              >
                Export RDB
                {(exportMutation.isPending || importMutation.isPending) && (
                  <LoadingSpinnerSmall sx={{ color: "#7F56D9", marginLeft: "12px" }} />
                )}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </>
  );
};

export default TasksTableHeader;
