import { useMemo } from "react";
import { Box, Link, Stack, Tooltip } from "@mui/material";

import Card from "src/components/Card/Card";
import { Text } from "src/components/Typography/Typography";
import StatusChip from "src/components/StatusChip/StatusChip";
import { getResourceInstanceTaskStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceTaskStatus";
import { getResourceInstanceTaskTypeStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceTaskTypeStatus";
import formatDateLocal from "src/utils/formatDateLocal";
import DataGrid from "src/components/DataGrid/DataGrid";
import useTasks, { TaskBase } from "src/components/ResourceInstance/ImportExportRDB/hooks/useTasks";
import TasksTableHeader from "src/components/ResourceInstance/ImportExportRDB/components/TasksTableHeader";
import DownloadCLIIcon from "src/components/Icons/DownloadCLI/DownloadCLIIcon";
import { useMutation } from "@tanstack/react-query";
import useSnackbar from "src/hooks/useSnackbar";
import { postInstanceExportRdb } from "src/api/falkordb";


function ResourceImportExportRDB(props) {
  const snackbar = useSnackbar();
  const {
    instanceId
  } = props;

  const tasksQuery = useTasks({
    instanceId,
  });
  const { data: tasksData = [], isLoading, isRefetching, refetch } = tasksQuery;

  const exportMutation = useMutation<unknown, unknown, { username: string, password: string }, unknown>(
    async (vars) => {
      await postInstanceExportRdb(
        instanceId,
        vars.username,
        vars.password,
      )
    },
    {
      onSuccess() {
        snackbar.showSuccess(`Export task submitted successfully`);
      },
      onError(error) {
        snackbar.showError(`Error: ${(error as any).response?.data?.message ?? error}`)
      },
    }
  )

  const columns = useMemo(
    () => [
      {
        field: "taskId",
        headerName: "Task ID",
        flex: 1,
        minWidth: 190,
      },
      {
        field: "type",
        headerName: "Type",
        flex: 0.5,
        renderCell: (params: { row: TaskBase }) => {
          const type = params.row.type;
          const statusStylesAndMap = getResourceInstanceTaskTypeStatusStylesAndLabel(type);
          return <StatusChip status={type} {...statusStylesAndMap} />;
        },
        minWidth: 100,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.5,
        renderCell: (params: { row: TaskBase }) => {
          const status = params.row.status;
          const statusStylesAndMap = getResourceInstanceTaskStatusStylesAndLabel(status);
          if (status === "failed") {
            return (
              <Tooltip
                title={params.row.error}>
                <StatusChip status={status} {...statusStylesAndMap} />
              </Tooltip>
            )
          }
          return <StatusChip status={status} {...statusStylesAndMap} />;
        },
        minWidth: 100,
      },
      {
        field: "createdAt",
        headerName: "Created On",
        flex: 1,
        minWidth: 170,
        valueGetter: (params: { row: TaskBase }) =>
          formatDateLocal(params.row.createdAt),
      },
      {
        field: "updatedAt",
        headerName: "Updated On",
        flex: 1,
        minWidth: 170,
        valueGetter: (params: { row: TaskBase }) =>
          formatDateLocal(params.row.updatedAt),
      },
      {
        field: "url",
        headerName: "URL",
        flex: 0.7,
        valueGetter: (params: { row: TaskBase }) => (params.row.output?.readUrl),
        renderCell: (params: { row: TaskBase; value?: string }) => {
          if (params.value) {
            // check if it expired
            if (
              params.row.payload?.destination?.expiresIn
              && new Date(params.row.updatedAt).getTime() + params.row.payload.destination.expiresIn < Date.now()
            ) {
              return <Text>Expired</Text>
            }
            return <Link target="_blank" href={params.value}>
              Download
            </Link>
          }
          return <Text> </Text>
        },
        minWidth: 150,
      },
    ],
    []
  );

  return (
    <>
      <Box mt="32px" display={"flex"} flexDirection={"column"} gap="32px">
        <DataGrid
          getRowId={(row) => row.taskId}
          columns={columns}
          rows={isRefetching ? [] : tasksData}
          components={{
            Header: TasksTableHeader,
          }}
          componentsProps={{
            header: {
              count: tasksData?.length,
              refetch,
              isRefetching,
              exportMutation,
            },
          }}
          getRowClassName={(params: { row: TaskBase }) => `${params.row.status}`}
          sx={{
            "& .node-ports": {
              color: "#101828",
              fontWeight: 500,
            },
            borderRadius: "8px",
          }}
          loading={isRefetching || isLoading}
          noRowsText="No tasks"
        />
      </Box>
    </>
  );
}

export default ResourceImportExportRDB;
