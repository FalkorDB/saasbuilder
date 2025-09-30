import { useMemo } from "react";
import { Box, Link, Tooltip } from "@mui/material";

import { Text } from "src/components/Typography/Typography";
import StatusChip from "src/components/StatusChip/StatusChip";
import { getResourceInstanceTaskStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceTaskStatus";
import { getResourceInstanceTaskTypeStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceTaskTypeStatus";
import formatDateLocal from "src/utils/formatDateLocal";
import DataGrid from "src/components/DataGrid/DataGrid";
import useTasks, { TaskBase } from "src/components/ResourceInstance/ImportExportRDB/hooks/useTasks";
import TasksTableHeader from "src/components/ResourceInstance/ImportExportRDB/components/TasksTableHeader";
import { useMutation } from "@tanstack/react-query";
import useSnackbar from "src/hooks/useSnackbar";
import { postInstanceExportRdb, postInstanceImportRdbConfirmUpload, postInstanceImportRdbRequestURL, uploadFile } from "src/api/falkordb";

function ResourceImportExportRDB(props) {
  const snackbar = useSnackbar();
  const { instanceId, status } = props;

  const tasksQuery = useTasks({
    instanceId,
  });
  const { data: tasksData = [], isLoading, isRefetching, refetch } = tasksQuery;

  const exportMutation = useMutation<unknown, unknown, { username: string; password: string }, unknown>(
    {
      mutationFn: async (vars) => {
        await postInstanceExportRdb(instanceId, vars.username, vars.password);
      },
      onSuccess: () => {
        snackbar.showSuccess(`Export task submitted successfully`);
      },
      onError: (error) => {
        snackbar.showError(`Error: ${(error as any).response?.data?.message ?? error}`);
      },
    }
  );

  const importMutation = useMutation<unknown, unknown, { username: string; password: string, file: ArrayBuffer }, unknown>(
    {
      mutationFn: async (vars) => {
        const { taskId, uploadUrl } = await postInstanceImportRdbRequestURL(instanceId, vars.username, vars.password);

        await uploadFile(uploadUrl, vars.file)

        await postInstanceImportRdbConfirmUpload(instanceId, taskId)
      },
      onSuccess: () => {
        snackbar.showSuccess(`Import task submitted successfully`);
      },
      onError: (error) => {
        snackbar.showError(`Error: ${(error as any).response?.data?.message ?? error}`);
      },
    }
  );

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
              <Tooltip title={params.row.error}>
                <StatusChip status={status} {...statusStylesAndMap} />
              </Tooltip>
            );
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
        valueGetter: (params: { row: TaskBase }) => formatDateLocal(params.row.createdAt),
      },
      {
        field: "updatedAt",
        headerName: "Updated On",
        flex: 1,
        minWidth: 170,
        valueGetter: (params: { row: TaskBase }) => formatDateLocal(params.row.updatedAt),
      },
      {
        field: "output",
        headerName: "Output",
        flex: 0.7,
        minWidth: 150,
        valueGetter: (params: { row: TaskBase }) => params.row.output?.readUrl,
        renderCell: (params: { row: TaskBase; value?: string }) => {
          if (params.row.status === "failed") {
            return <Link underline="hover" onClick={() => snackbar.showError(params.row.error)}><Text ellipsis={true}>{params.row.error}</Text></Link>
          }
          if (params.row.status !== 'completed') {
            return <Text> </Text>
          }
          if (params.row.type === 'RDBImport') {
            const numberOfKeys = params.row.output?.numberOfKeys ?? 0;
            if (numberOfKeys > 1)
              return <Text>{numberOfKeys} keys imported</Text>;
            else if (numberOfKeys === 1)
              return <Text>1 key imported</Text>;
            else if (!numberOfKeys)
              return <Text>No keys imported</Text>;
          }

          if (params.value) {
            // check if it expired
            if (
              params.row.payload?.destination?.expiresIn &&
              new Date(params.row.updatedAt).getTime() + params.row.payload.destination.expiresIn < Date.now()
            ) {
              return <Text>Expired</Text>;
            }
            return (
              <Link target="_blank" href={params.value}>
                Download
              </Link>
            );
          }
          return <Text> </Text>;
        },
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
              importMutation,
              status
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
