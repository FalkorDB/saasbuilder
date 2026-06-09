import { type ChangeEvent, useMemo, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, DialogContent, LinearProgress, Link, Stack, Tooltip } from "@mui/material";
import { styled } from "@mui/system";
import { useMutation } from "@tanstack/react-query";
import useInstances from "app/(dashboard)/instances/hooks/useInstances";

import {
  postInstanceExportRdb,
  postInstanceImportRdbConfirmUpload,
  postInstanceImportRdbRequestURL,
  type RDBExportTarget,
  type RDBImportSource,
  uploadFile,
} from "src/api/falkordb";
import Button from "src/components/Button/Button";
import DataGrid from "src/components/DataGrid/DataGrid";
import InformationDialogTopCenter, {
  DialogFooter,
  DialogHeader,
} from "src/components/Dialog/InformationDialogTopCenter";
import FieldContainer from "src/components/FormElements/FieldContainer/FieldContainer";
import FieldLabel from "src/components/FormElements/FieldLabel/FieldLabel";
import FormControlLabel from "src/components/FormElementsv2/FormControlLabel/FormControlLabel";
import MenuItem from "src/components/FormElementsv2/MenuItem/MenuItem";
import { PasswordField } from "src/components/FormElementsv2/PasswordField/PasswordField";
import Radio, { RadioGroup } from "src/components/FormElementsv2/Radio/Radio";
import Select from "src/components/FormElementsv2/Select/Select";
import TextField from "src/components/FormElementsv2/TextField/TextField";
import TasksTableHeader from "src/components/ResourceInstance/ImportExportRDB/components/TasksTableHeader";
import useTasks, { TaskBase } from "src/components/ResourceInstance/ImportExportRDB/hooks/useTasks";
import StatusChip from "src/components/StatusChip/StatusChip";
import { Text } from "src/components/Typography/Typography";
import { getResourceInstanceTaskStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceTaskStatus";
import { getResourceInstanceTaskTypeStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceTaskTypeStatus";
import useSnackbar from "src/hooks/useSnackbar";
import type { ResourceInstance } from "src/types/resourceInstance";
import formatDateLocal from "src/utils/formatDateLocal";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

type RDBExportTargetType = "default" | "gcs" | "s3";
type RDBImportSourceType = "file" | "gcs" | "s3" | "url" | "instance";

type ExportMutationVariables = {
  username: string;
  password: string;
  target?: RDBExportTarget;
};

type ImportMutationVariables = {
  username: string;
  password: string;
  file?: ArrayBuffer;
  source?: RDBImportSource;
};

const getFormValue = (formJson: Record<string, unknown>, name: string) => String(formJson[name] ?? "").trim();

const buildExportTarget = (formJson: Record<string, unknown>, targetType: RDBExportTargetType): RDBExportTarget => {
  if (targetType === "gcs") {
    return {
      type: "gcs",
      bucketName: getFormValue(formJson, "gcsBucketName"),
      credentials: JSON.parse(getFormValue(formJson, "gcsCredentials")),
    };
  }

  if (targetType === "s3") {
    const sessionToken = getFormValue(formJson, "s3SessionToken");

    return {
      type: "s3",
      bucketName: getFormValue(formJson, "s3BucketName"),
      region: getFormValue(formJson, "s3Region"),
      accessKeyId: getFormValue(formJson, "s3AccessKeyId"),
      secretAccessKey: getFormValue(formJson, "s3SecretAccessKey"),
      ...(sessionToken ? { sessionToken } : {}),
    };
  }

  return { type: "default" };
};

const buildImportSource = (
  formJson: Record<string, unknown>,
  sourceType: RDBImportSourceType
): RDBImportSource | undefined => {
  if (sourceType === "gcs") {
    return {
      type: "gcs",
      bucketName: getFormValue(formJson, "importGcsBucketName"),
      fileName: getFormValue(formJson, "importGcsFileName"),
      credentials: JSON.parse(getFormValue(formJson, "importGcsCredentials")),
    };
  }

  if (sourceType === "s3") {
    const sessionToken = getFormValue(formJson, "importS3SessionToken");

    return {
      type: "s3",
      bucketName: getFormValue(formJson, "importS3BucketName"),
      key: getFormValue(formJson, "importS3Key"),
      region: getFormValue(formJson, "importS3Region"),
      accessKeyId: getFormValue(formJson, "importS3AccessKeyId"),
      secretAccessKey: getFormValue(formJson, "importS3SecretAccessKey"),
      ...(sessionToken ? { sessionToken } : {}),
    };
  }

  if (sourceType === "url") {
    return {
      type: "url",
      url: getFormValue(formJson, "importUrl"),
    };
  }

  if (sourceType === "instance") {
    return {
      type: "instance",
      instanceId: getFormValue(formJson, "importSourceInstanceId"),
      username: getFormValue(formJson, "importSourceInstanceUsername"),
      password: getFormValue(formJson, "importSourceInstancePassword"),
    };
  }

  return undefined;
};

const getRecordString = (record: Record<string, unknown> | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
};

const getInstanceDisplayFields = (instance: ResourceInstance) => {
  const instanceRecord = instance as Record<string, unknown>;
  const resultParams = instance.result_params as Record<string, unknown> | undefined;

  const instanceName = getRecordString(resultParams, "name") || instance.id || "Instance";
  const deploymentType =
    getRecordString(instanceRecord, "serviceModelType") ||
    getRecordString(instanceRecord, "serviceModelKey") ||
    getRecordString(instanceRecord, "deploymentType");
  const cloudProvider = instance.cloud_provider || getRecordString(resultParams, "cloud_provider");
  const region = instance.region || getRecordString(resultParams, "region");
  const details = [instanceName, deploymentType, cloudProvider, region].filter(Boolean).join(" | ");

  return {
    details,
    instanceId: instance.id || "Instance",
  };
};

const renderInstanceOption = (instance: ResourceInstance) => {
  const { details, instanceId } = getInstanceDisplayFields(instance);

  return (
    <Stack gap="2px" minWidth={0}>
      <Text size="xsmall" weight="regular" color="#667085" ellipsis>
        {instanceId}
      </Text>
      <Text size="small" weight="medium" color="#101828" ellipsis>
        {details}
      </Text>
    </Stack>
  );
};

function ResourceImportExportRDB(props) {
  const snackbar = useSnackbar();
  const { instanceId, status } = props;
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialog, setDialog] = useState<{ open: boolean; type?: "export" | "import" }>({ open: false, type: "export" });
  const [file, setFile] = useState<File | undefined>();
  const [exportTargetType, setExportTargetType] = useState<RDBExportTargetType>("default");
  const [importSourceType, setImportSourceType] = useState<RDBImportSourceType>("file");

  const closeDialog = () => {
    setDialog({ open: false });
    setFile(undefined);
    setExportTargetType("default");
    setImportSourceType("file");
  };

  const tasksQuery = useTasks({
    instanceId,
  });
  const { data: tasksData = [], isLoading, isRefetching, refetch } = tasksQuery;
  const { data: sourceInstances = [], isPending: isSourceInstancesPending } = useInstances({ onlyInstances: true });
  const runningSourceInstances = sourceInstances.filter((sourceInstance) => sourceInstance.status === "RUNNING");

  const exportMutation = useMutation<unknown, unknown, ExportMutationVariables, unknown>({
    mutationFn: async (vars) => {
      await postInstanceExportRdb(instanceId, vars.username, vars.password, vars.target);
    },
    onSuccess: () => {
      snackbar.showSuccess(`Export task submitted successfully`);
    },
    onError: (error) => {
      snackbar.showError(`Error: ${(error as any).response?.data?.message ?? error}`);
    },
  });

  const importMutation = useMutation<unknown, unknown, ImportMutationVariables, unknown>({
    mutationFn: async (vars) => {
      const { taskId, uploadUrl } = await postInstanceImportRdbRequestURL(
        instanceId,
        vars.username,
        vars.password,
        vars.source
      );

      if (vars.source) {
        return;
      }

      if (!vars.file || !uploadUrl) {
        throw new Error("Unable to prepare RDB file upload");
      }

      await uploadFile(uploadUrl, vars.file, (progressEvent) => {
        setUploadProgress(Math.floor((progressEvent.progress ?? 0) * 100));
      });

      await postInstanceImportRdbConfirmUpload(instanceId, taskId);

      setUploadProgress(0);
    },
    onSuccess: () => {
      snackbar.showSuccess(`Import task submitted successfully`);
    },
    onError: (error) => {
      snackbar.showError(`Error: ${(error as any).response?.data?.message ?? error}`);
    },
  });

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
              <Tooltip title={params.row.errors?.[0] ?? "Unknown error"}>
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
            return (
              <Link underline="hover" onClick={() => snackbar.showError(params.row.errors?.[0] ?? "Unknown error")}>
                <Text ellipsis={true}>{params.row.errors?.[0] ?? "Unknown error"}</Text>
              </Link>
            );
          }
          if (params.row.status !== "completed") {
            return <Text> </Text>;
          }
          if (params.row.type === "RDBImport") {
            const numberOfKeys = params.row.output?.numberOfKeys ?? 0;
            if (numberOfKeys > 1) return <Text>{numberOfKeys} keys imported</Text>;
            else if (numberOfKeys === 1) return <Text>1 key imported</Text>;
            else if (!numberOfKeys) return <Text>No keys imported</Text>;
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
    [snackbar]
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
              status,
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
        handleClose={closeDialog}
        open={dialog.open}
        PaperProps={{
          component: "form",
          onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());

            if (dialog.type === "import") {
              let source: RDBImportSource | undefined;

              try {
                source = buildImportSource(formJson, importSourceType);
              } catch {
                snackbar.showError("GCS credentials must be valid service account JSON");
                return;
              }

              if (importSourceType === "file" && !file) {
                snackbar.showError(`Please select a valid RDB file`);
                return;
              }

              await importMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
                file: file ? await file.arrayBuffer() : undefined,
                source,
              });
            } else {
              let target: RDBExportTarget;

              try {
                target = buildExportTarget(formJson, exportTargetType);
              } catch {
                snackbar.showError("GCS credentials must be valid service account JSON");
                return;
              }

              await exportMutation.mutateAsync({
                username: formJson.username,
                password: formJson.password,
                target,
              });
            }
            refetch();
            closeDialog();
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
        <DialogContent
          sx={{
            marginTop: "12px",
            maxHeight: "min(620px, calc(100vh - 220px))",
            overflowY: "auto",
            pr: "8px",
          }}
        >
          <Box
            sx={{
              "& > .MuiBox-root": {
                marginTop: "12px",
              },
              "& .MuiFormGroup-root": {
                marginTop: "4px",
                rowGap: "4px",
              },
            }}
          >
            <Text size="small" weight="regular" color="#344054">
              To {dialog.type} your RDB, you must enter again the username and password with read/write access to your
              FalkorDB Instance
            </Text>
            {dialog.type === "import" && (
              <Text size="small" weight="semibold" color="#EF4444">
                Caution: Your instance will be erased before the import takes place.
              </Text>
            )}
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
            {dialog.type === "export" && (
              <>
                <FieldContainer>
                  <Stack direction="row" alignItems="center" gap="6px">
                    <FieldLabel required>Destination</FieldLabel>
                    <Text size="small" weight="semibold" color="#667085">
                      beta
                    </Text>
                  </Stack>
                  <RadioGroup
                    row
                    name="exportTargetType"
                    value={exportTargetType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setExportTargetType(event.target.value as RDBExportTargetType)
                    }
                  >
                    <FormControlLabel value="default" control={<Radio />} label="Temporary link" />
                    <FormControlLabel value="gcs" control={<Radio />} label="Google Cloud Storage" />
                    <FormControlLabel value="s3" control={<Radio />} label="Amazon S3" />
                  </RadioGroup>
                  {exportTargetType === "default" && (
                    <Text size="small" weight="regular" color="#667085">
                      A temporary download link will be generated when the export is complete.
                    </Text>
                  )}
                </FieldContainer>
                {exportTargetType === "gcs" && (
                  <>
                    <Text size="small" weight="regular" color="#667085">
                      Use a GCP service account with permission to create objects in the destination bucket.
                    </Text>
                    <FieldContainer>
                      <FieldLabel required>GCS bucket name</FieldLabel>
                      <TextField
                        required
                        id="gcsBucketName"
                        name="gcsBucketName"
                        placeholder="my-rdb-exports"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>GCP service account key JSON</FieldLabel>
                      <TextField
                        required
                        id="gcsCredentials"
                        name="gcsCredentials"
                        placeholder='{"type":"service_account",...}'
                        fullWidth
                        multiline
                        minRows={4}
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                  </>
                )}
                {exportTargetType === "s3" && (
                  <>
                    <Text size="small" weight="regular" color="#667085">
                      Use AWS access credentials with permission to create objects in the destination bucket.
                    </Text>
                    <FieldContainer>
                      <FieldLabel required>S3 bucket name</FieldLabel>
                      <TextField
                        required
                        id="s3BucketName"
                        name="s3BucketName"
                        placeholder="my-rdb-exports"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Region</FieldLabel>
                      <TextField
                        required
                        id="s3Region"
                        name="s3Region"
                        placeholder="us-east-1"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Access key ID</FieldLabel>
                      <TextField
                        required
                        id="s3AccessKeyId"
                        name="s3AccessKeyId"
                        placeholder="AKIA..."
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Secret access key</FieldLabel>
                      <PasswordField
                        required
                        id="s3SecretAccessKey"
                        name="s3SecretAccessKey"
                        placeholder="secret access key"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel>Session token</FieldLabel>
                      <PasswordField
                        id="s3SessionToken"
                        name="s3SessionToken"
                        placeholder="temporary session token"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                  </>
                )}
              </>
            )}
            {dialog.type === "import" && (
              <>
                <FieldContainer>
                  <Stack direction="row" alignItems="center" gap="6px">
                    <FieldLabel required>Source</FieldLabel>
                    <Text size="small" weight="semibold" color="#667085">
                      beta
                    </Text>
                  </Stack>
                  <RadioGroup
                    row
                    name="importSourceType"
                    value={importSourceType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setImportSourceType(event.target.value as RDBImportSourceType)
                    }
                  >
                    <FormControlLabel value="file" control={<Radio />} label="Upload file" />
                    <FormControlLabel value="gcs" control={<Radio />} label="Google Cloud Storage" />
                    <FormControlLabel value="s3" control={<Radio />} label="Amazon S3" />
                    <FormControlLabel value="url" control={<Radio />} label="URL" />
                    <FormControlLabel value="instance" control={<Radio />} label="Instance" />
                  </RadioGroup>
                  {importSourceType === "file" && (
                    <Text size="small" weight="regular" color="#667085">
                      Upload an RDB file from your local machine.
                    </Text>
                  )}
                </FieldContainer>
                {importSourceType === "file" && (
                  <FieldContainer>
                    <Stack
                      spacing={{ xs: 2 }}
                      direction="row"
                      useFlexGap
                      sx={{ flexWrap: "nowrap" }}
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
                            setFile(event?.target?.files?.[0]);
                          }}
                        />
                      </Button>
                      {file && (
                        <Text ellipsis={true} maxWidth="275px">
                          {file.name}
                        </Text>
                      )}
                    </Stack>

                    {importMutation.isPending && (
                      <Stack direction="row" gap="8px" alignItems="center" marginTop="16px">
                        <Box width="100%">
                          <LinearProgress variant="determinate" value={uploadProgress} />
                        </Box>
                        <Box component="span" sx={{ fontSize: 14 }}>
                          {uploadProgress}%
                        </Box>
                      </Stack>
                    )}
                  </FieldContainer>
                )}
                {importSourceType === "gcs" && (
                  <>
                    <Text size="small" weight="regular" color="#667085">
                      Use a GCP service account with permission to read objects from the source bucket.
                    </Text>
                    <FieldContainer>
                      <FieldLabel required>GCS bucket name</FieldLabel>
                      <TextField
                        required
                        id="importGcsBucketName"
                        name="importGcsBucketName"
                        placeholder="my-rdb-imports"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>RDB file path</FieldLabel>
                      <TextField
                        required
                        id="importGcsFileName"
                        name="importGcsFileName"
                        placeholder="path/to/dump.rdb"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>GCP service account key JSON</FieldLabel>
                      <TextField
                        required
                        id="importGcsCredentials"
                        name="importGcsCredentials"
                        placeholder='{"type":"service_account",...}'
                        fullWidth
                        multiline
                        minRows={4}
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                  </>
                )}
                {importSourceType === "s3" && (
                  <>
                    <Text size="small" weight="regular" color="#667085">
                      Use AWS access credentials with permission to read objects from the source bucket.
                    </Text>
                    <FieldContainer>
                      <FieldLabel required>S3 bucket name</FieldLabel>
                      <TextField
                        required
                        id="importS3BucketName"
                        name="importS3BucketName"
                        placeholder="my-rdb-imports"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>RDB file path</FieldLabel>
                      <TextField
                        required
                        id="importS3Key"
                        name="importS3Key"
                        placeholder="path/to/dump.rdb"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Region</FieldLabel>
                      <TextField
                        required
                        id="importS3Region"
                        name="importS3Region"
                        placeholder="us-east-1"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Access key ID</FieldLabel>
                      <TextField
                        required
                        id="importS3AccessKeyId"
                        name="importS3AccessKeyId"
                        placeholder="AKIA..."
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Secret access key</FieldLabel>
                      <PasswordField
                        required
                        id="importS3SecretAccessKey"
                        name="importS3SecretAccessKey"
                        placeholder="secret access key"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel>Session token</FieldLabel>
                      <PasswordField
                        id="importS3SessionToken"
                        name="importS3SessionToken"
                        placeholder="temporary session token"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                  </>
                )}
                {importSourceType === "url" && (
                  <>
                    <Text size="small" weight="regular" color="#667085">
                      Use a direct URL that the importer can read to download the RDB file.
                    </Text>
                    <FieldContainer>
                      <FieldLabel required>RDB file URL</FieldLabel>
                      <TextField
                        required
                        id="importUrl"
                        name="importUrl"
                        placeholder="https://example.com/path/to/dump.rdb"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                  </>
                )}
                {importSourceType === "instance" && (
                  <>
                    <Text size="small" weight="regular" color="#667085">
                      Select an instance you can access and enter credentials with read access to that source instance.
                    </Text>
                    <FieldContainer>
                      <FieldLabel required>Source instance</FieldLabel>
                      <Select
                        required
                        displayEmpty
                        id="importSourceInstanceId"
                        name="importSourceInstanceId"
                        defaultValue=""
                        isLoading={isSourceInstancesPending}
                        renderValue={(value: unknown) => {
                          const selectedInstance = runningSourceInstances.find(
                            (sourceInstance) => sourceInstance.id === value
                          );
                          return selectedInstance ? renderInstanceOption(selectedInstance) : "Select source instance";
                        }}
                        fullWidth
                      >
                        <MenuItem value="" disabled>
                          Select source instance
                        </MenuItem>
                        {runningSourceInstances.map((sourceInstance) => (
                          <MenuItem key={sourceInstance.id} value={sourceInstance.id}>
                            {renderInstanceOption(sourceInstance)}
                          </MenuItem>
                        ))}
                        {!isSourceInstancesPending && runningSourceInstances.length === 0 && (
                          <MenuItem disabled>No running instances available</MenuItem>
                        )}
                      </Select>
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Source username</FieldLabel>
                      <TextField
                        required
                        id="importSourceInstanceUsername"
                        name="importSourceInstanceUsername"
                        placeholder="falkordb"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                    <FieldContainer>
                      <FieldLabel required>Source password</FieldLabel>
                      <PasswordField
                        required
                        id="importSourceInstancePassword"
                        name="importSourceInstancePassword"
                        placeholder="source instance password"
                        fullWidth
                        sx={{ mt: 0 }}
                      />
                    </FieldContainer>
                  </>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outlined"
            onClick={closeDialog}
            disabled={exportMutation.isPending || importMutation.isPending}
          >
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={exportMutation.isPending || importMutation.isPending}>
            {dialog.type === "export" ? "Export" : "Import"}
          </Button>
        </DialogFooter>
      </InformationDialogTopCenter>
    </>
  );
}

export default ResourceImportExportRDB;
