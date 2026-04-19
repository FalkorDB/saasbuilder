import { useMemo, useState } from "react";
import { Box, Link, Tooltip, Stack, DialogContent, LinearProgress } from "@mui/material";

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
import InformationDialogTopCenter, {
  DialogFooter,
  DialogHeader,
} from "src/components/Dialog/InformationDialogTopCenter";
import TextField from "src/components/FormElementsv2/TextField/TextField";
import { PasswordField } from "src/components/FormElementsv2/PasswordField/PasswordField";
import FieldContainer from "src/components/FormElements/FieldContainer/FieldContainer";
import FieldLabel from "src/components/FormElements/FieldLabel/FieldLabel";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from "@mui/system";
import Button from "src/components/Button/Button";

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function ResourceImportExportRDB(props) {
  const snackbar = useSnackbar();
  const { instanceId, status } = props;
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dialog, setDialog] = useState<{ open: boolean, type?: 'export' | 'import' }>({ open: false, type: 'export' });
  const [file, setFile] = useState<File | undefined>();

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

        await uploadFile(uploadUrl, vars.file, (progressEvent) => {
          setUploadProgress(Math.floor((progressEvent.progress ?? 0) * 100))
        })

        await postInstanceImportRdbConfirmUpload(instanceId, taskId)

        setUploadProgress(0);
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
              return <Text>Link Expired</Text>;
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
              openDialog: (params) => setDialog(params),
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


      <InformationDialogTopCenter
        handleClose={() => { setDialog({ open: false }); setFile(undefined) }}
        open={dialog.open}
        PaperProps={{
          component: "form",
          onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());

            if (dialog.type === "import") {

              if (!file) {
                snackbar.showError(`Please select a valid RDB file`);
                return;
              }
              await importMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
                file: await file.arrayBuffer(),
              })
            } else {
              await exportMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
              });
            }
            refetch();
            setDialog({ open: false });
            setFile(undefined)
          },
        }}
      >
        <DialogHeader>
          <Box>
            <Text size="large" weight="bold">
              Enter the instance&apos;s username and password
            </Text>
          </Box>
        </DialogHeader>
        <DialogContent>
          <Box>
            <Text size="small" weight="regular" color="#344054">
              To {dialog.type} your RDB, you must enter again the username and password with read/write access to your FalkorDB
              Instance
            </Text>
            {
              dialog.type === 'import' && (
                <Text size="small" weight="semibold" color="#EF4444">
                  Caution: Your instance will be erased before the import takes place.
                </Text>
              )
            }
            <FieldContainer>
              <FieldLabel required>Username</FieldLabel>
              <TextField
                autoFocus
                required
                id="username"
                name="username"
                placeholder="falkordb"
                fullWidth
                sx={{ mt: 0 }}
              />
            </FieldContainer>
            <FieldContainer>
              <FieldLabel required>Password</FieldLabel>
              <PasswordField
                required
                id="password"
                name="password"
                placeholder="your password"
                fullWidth
                sx={{ mt: 0 }}
              />
            </FieldContainer>
            {
              dialog.type === "import" && (
                <FieldContainer>
                  <Stack
                    spacing={{ xs: 2 }}
                    direction="row"
                    useFlexGap
                    sx={{ flexWrap: 'nowrap' }}
                    alignItems="center"
                  >
                    <Button
                      component="label"
                      role={undefined}
                      variant="contained"
                      tabIndex={-1}
                      startIcon={<CloudUploadIcon />}
                    >
                      Select RDB file
                      <VisuallyHiddenInput
                        type="file"
                        accept=".rdb"
                        onChange={(event) => {
                          setFile(event?.target?.files?.[0])
                        }}
                      />
                    </Button>
                    {
                      file && (
                        <Text ellipsis={true} maxWidth="275px">{file.name}</Text>
                      )
                    }
                  </Stack>

                  {
                    importMutation.isPending && (
                      <Stack direction="row" gap="8px" alignItems="center" marginTop="16px">
                        <Box width="100%">
                          <LinearProgress variant="determinate" value={uploadProgress} />
                        </Box>
                        <Box component="span" sx={{ fontSize: 14 }}>
                          {uploadProgress}%
                        </Box>
                      </Stack>
                    )
                  }
                </FieldContainer>
              )
            }
          </Box>
        </DialogContent>
        <DialogFooter>
          <Button variant="outlined" onClick={() => { setDialog({ open: false }); setFile(undefined) }} disabled={exportMutation.isPending || importMutation.isPending}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={exportMutation.isPending || importMutation.isPending}>
            {dialog.type === 'export' ? 'Export' : 'Import'}
          </Button>
        </DialogFooter>
      </InformationDialogTopCenter>
    </>
  );
}

export default ResourceImportExportRDB;
