import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, DialogContent, LinearProgress, Link, Stack, Tooltip } from "@mui/material";
import { styled } from "@mui/system";
import { useMutation, useQuery } from "@tanstack/react-query";
import useInstances from "app/(dashboard)/instances/hooks/useInstances";

import {
  type CreateScheduleRequestBody,
  getSchedules,
  postInstanceExportRdb,
  postInstanceImportRdbConfirmUpload,
  postInstanceImportRdbRequestURL,
  postSchedule,
  type PublicSchedule,
  type RDBExportScheduleTarget,
  type RDBExportTarget,
  type RDBImportInstanceSource,
  type RDBImportSource,
  type ScheduleMinuteOfHour,
  type ScheduleType,
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
import { useGlobalData } from "src/providers/GlobalDataProvider";
import type { ResourceInstance } from "src/types/resourceInstance";
import formatDateLocal from "src/utils/formatDateLocal";
import { getInstanceDetailsRoute } from "src/utils/routes";

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
type RDBScheduleExportTargetType = Exclude<RDBExportTargetType, "default">;

type SubscriptionRouteData = Record<string, { productTierId?: string; serviceId?: string } | undefined>;

const DEFAULT_SCHEDULE_ALLOWED_TIERS = ["FalkorDB Pro", "FalkorDB Enterprise"];
const DEFAULT_MAX_EXPORT_SCHEDULES = 5;

const TASK_LOCATION_TYPE_LABELS: Record<string, string> = {
  default: "Link",
  file: "File",
  gcs: "GCS",
  instance: "Instance",
  s3: "S3",
  url: "URL",
};

type ExportMutationVariables = {
  target?: RDBExportTarget;
};

type ImportMutationVariables = {
  file?: ArrayBuffer;
  source?: RDBImportSource;
};

type CreateScheduleMutationVariables = {
  schedule: CreateScheduleRequestBody;
};

const getFormValue = (formJson: Record<string, unknown>, name: string) => String(formJson[name] ?? "").trim();

const getConfiguredScheduleAllowedTiers = () => {
  return (process.env.NEXT_PUBLIC_RDB_SCHEDULE_ALLOWED_TIERS || DEFAULT_SCHEDULE_ALLOWED_TIERS.join(","))
    .split(",")
    .map((tier) => tier.trim())
    .filter(Boolean);
};

const getConfiguredMaxExportSchedules = () => {
  const maxExportSchedules = Number(process.env.NEXT_PUBLIC_RDB_SCHEDULE_MAX_EXPORT_SCHEDULES);
  return Number.isInteger(maxExportSchedules) && maxExportSchedules >= 0
    ? maxExportSchedules
    : DEFAULT_MAX_EXPORT_SCHEDULES;
};

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
    };
  }

  return undefined;
};

const getOptionalNumberFormValue = (formJson: Record<string, unknown>, name: string) => {
  const rawValue = getFormValue(formJson, name);
  return rawValue ? Number(rawValue) : undefined;
};

const buildScheduleRequestBody = (
  formJson: Record<string, unknown>,
  instanceId: string,
  scheduleType: ScheduleType,
  exportTargetType: RDBScheduleExportTargetType
): CreateScheduleRequestBody => {
  const periodMinutes = Number(getFormValue(formJson, "schedulePeriodMinutes"));
  const minuteOfHour = Number(getFormValue(formJson, "scheduleMinuteOfHour")) as ScheduleMinuteOfHour;
  const failureThreshold = getOptionalNumberFormValue(formJson, "scheduleFailureThreshold");
  const scheduleBase = {
    periodMinutes,
    minuteOfHour,
    ...(failureThreshold ? { failureThreshold } : {}),
  };

  if (scheduleType === "RDBExport") {
    return {
      type: "RDBExport",
      payload: {
        instanceId,
        target: buildExportTarget(formJson, exportTargetType) as RDBExportScheduleTarget,
      },
      ...scheduleBase,
    };
  }

  const source = buildImportSource(formJson, "instance");

  if (!source) {
    throw new Error("Scheduled imports require a source instance");
  }

  return {
    type: "RDBImport",
    payload: {
      instanceId,
      source: source as RDBImportInstanceSource,
    },
    ...scheduleBase,
  };
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
    Object.values(instanceRecord?.["detailedNetworkTopology"] || {}).find((v) => v.main)?.resourceName ?? "";
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

const getTaskLocationTypeLabel = (task: TaskBase) => {
  const rawType =
    task.type === "RDBImport" ? task.payload?.source?.type || "file" : task.payload?.destination?.type || "default";
  return TASK_LOCATION_TYPE_LABELS[rawType] ?? rawType;
};

const getScheduleLocationTypeLabel = (schedule: PublicSchedule) => {
  if (schedule.type === "RDBImport" && "source" in schedule.payload) {
    const rawType = schedule.payload.source.type;
    return TASK_LOCATION_TYPE_LABELS[rawType] ?? rawType;
  }

  if (schedule.type === "RDBExport" && "target" in schedule.payload) {
    const rawType = schedule.payload.target?.type || "default";
    return TASK_LOCATION_TYPE_LABELS[rawType] ?? rawType;
  }

  return "-";
};

const getSchedulePeriodLabel = (periodMinutes: number) => {
  if (periodMinutes % 60 === 0) {
    const hours = periodMinutes / 60;
    return `Every ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `Every ${periodMinutes} minutes`;
};

const getSourceInstanceRoute = (
  sourceInstance: ResourceInstance | undefined,
  subscriptionsObj: SubscriptionRouteData
) => {
  if (!sourceInstance?.id || !sourceInstance.subscriptionId || !sourceInstance.resourceID) {
    return undefined;
  }

  const subscription = subscriptionsObj[sourceInstance.subscriptionId];

  if (!subscription?.serviceId || !subscription.productTierId) {
    return undefined;
  }

  return getInstanceDetailsRoute({
    serviceId: subscription.serviceId,
    servicePlanId: subscription.productTierId,
    resourceId: sourceInstance.resourceID,
    instanceId: sourceInstance.id,
    subscriptionId: sourceInstance.subscriptionId,
  });
};

function ResourceImportExportRDB(props) {
  const snackbar = useSnackbar();
  const { subscriptionsObj } = useGlobalData();
  const { instanceId, productTierName, status } = props;
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialog, setDialog] = useState<{ open: boolean; type?: "export" | "import" | "schedules" }>({
    open: false,
    type: "export",
  });
  const [file, setFile] = useState<File | undefined>();
  const [exportTargetType, setExportTargetType] = useState<RDBExportTargetType>("default");
  const [importSourceType, setImportSourceType] = useState<RDBImportSourceType>("file");
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("RDBExport");
  const [scheduleExportTargetType, setScheduleExportTargetType] = useState<RDBScheduleExportTargetType>("gcs");

  const scheduleAllowedTiers = useMemo(getConfiguredScheduleAllowedTiers, []);
  const maxExportSchedules = useMemo(getConfiguredMaxExportSchedules, []);
  const isSchedulesAvailable = Boolean(productTierName && scheduleAllowedTiers.includes(productTierName));

  const closeDialog = () => {
    setDialog({ open: false });
    setFile(undefined);
    setExportTargetType("default");
    setImportSourceType("file");
    setScheduleFormOpen(false);
    setScheduleType("RDBExport");
    setScheduleExportTargetType("gcs");
  };

  const tasksQuery = useTasks({
    instanceId,
  });
  const { data: tasksData = [], isLoading, isRefetching, refetch } = tasksQuery;
  const { data: sourceInstances = [], isPending: isSourceInstancesPending } = useInstances({ onlyInstances: true });
  const schedulesQuery = useQuery({
    queryKey: ["get-rdb-schedules", instanceId],
    queryFn: async () => {
      const response = await getSchedules({ instanceId });
      return response.data.data;
    },
    enabled: dialog.open && dialog.type === "schedules",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const {
    data: schedulesData = [],
    isLoading: isSchedulesLoading,
    isRefetching: isSchedulesRefetching,
    refetch: refetchSchedules,
  } = schedulesQuery;
  const runningSourceInstances = sourceInstances.filter(
    (sourceInstance) => sourceInstance.status === "RUNNING" && sourceInstance.id !== instanceId
  );
  const importSchedulesCount = schedulesData.filter((schedule) => schedule.type === "RDBImport").length;
  const exportSchedulesCount = schedulesData.filter((schedule) => schedule.type === "RDBExport").length;
  const hasImportSchedule = importSchedulesCount > 0;
  const hasReachedExportScheduleLimit = exportSchedulesCount >= maxExportSchedules;
  const canCreateImportSchedule = !hasImportSchedule;
  const canCreateExportSchedule = !hasReachedExportScheduleLimit;
  const canCreateSelectedScheduleType =
    scheduleType === "RDBImport" ? canCreateImportSchedule : canCreateExportSchedule;

  const openCreateScheduleForm = () => {
    if (scheduleFormOpen) {
      setScheduleFormOpen(false);
      return;
    }

    setScheduleType(canCreateExportSchedule ? "RDBExport" : "RDBImport");
    setScheduleExportTargetType("gcs");
    setScheduleFormOpen(true);
  };

  const renderTaskLocationType = useCallback(
    (task: TaskBase) => {
      const label = getTaskLocationTypeLabel(task);
      const sourceInstanceId = task.payload?.source?.type === "instance" ? task.payload.source.instanceId : undefined;

      if (!sourceInstanceId) {
        return <Text>{label}</Text>;
      }

      const sourceInstance = sourceInstances.find((sourceInstance) => sourceInstance.id === sourceInstanceId);
      const sourceInstanceRoute = getSourceInstanceRoute(sourceInstance, subscriptionsObj);

      if (!sourceInstanceRoute) {
        return <Text>{sourceInstanceId}</Text>;
      }

      return (
        <Link href={sourceInstanceRoute} underline="hover">
          <Text color="#2E90FA" ellipsis>
            {sourceInstanceId}
          </Text>
        </Link>
      );
    },
    [sourceInstances, subscriptionsObj]
  );

  const renderScheduleLocationType = useCallback(
    (schedule: PublicSchedule) => {
      const label = getScheduleLocationTypeLabel(schedule);
      const sourceInstanceId =
        schedule.type === "RDBImport" && "source" in schedule.payload && schedule.payload.source.type === "instance"
          ? schedule.payload.source.instanceId
          : undefined;

      if (!sourceInstanceId) {
        return <Text>{label}</Text>;
      }

      const sourceInstance = sourceInstances.find((sourceInstance) => sourceInstance.id === sourceInstanceId);
      const sourceInstanceRoute = getSourceInstanceRoute(sourceInstance, subscriptionsObj);

      if (!sourceInstanceRoute) {
        return <Text>{sourceInstanceId}</Text>;
      }

      return (
        <Link href={sourceInstanceRoute} underline="hover">
          <Text color="#2E90FA" ellipsis>
            {sourceInstanceId}
          </Text>
        </Link>
      );
    },
    [sourceInstances, subscriptionsObj]
  );

  const exportMutation = useMutation<unknown, unknown, ExportMutationVariables, unknown>({
    mutationFn: async (vars) => {
      await postInstanceExportRdb(instanceId, vars.target);
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
      const { taskId, uploadUrl } = await postInstanceImportRdbRequestURL(instanceId, vars.source);

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

  const createScheduleMutation = useMutation<unknown, unknown, CreateScheduleMutationVariables, unknown>({
    mutationFn: async (vars) => {
      await postSchedule(vars.schedule);
    },
    onSuccess: () => {
      snackbar.showSuccess("Schedule created successfully");
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
        field: "locationType",
        headerName: "Source/Destination",
        flex: 0.65,
        renderCell: (params: { row: TaskBase }) => renderTaskLocationType(params.row),
        minWidth: 150,
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
    [renderTaskLocationType, snackbar]
  );

  const scheduleColumns = useMemo(
    () => [
      {
        field: "scheduleId",
        headerName: "Schedule ID",
        flex: 1,
        minWidth: 190,
      },
      {
        field: "type",
        headerName: "Type",
        flex: 0.55,
        minWidth: 110,
        renderCell: (params: { row: PublicSchedule }) => {
          const statusStylesAndMap = getResourceInstanceTaskTypeStatusStylesAndLabel(params.row.type);
          return <StatusChip status={params.row.type} {...statusStylesAndMap} />;
        },
      },
      {
        field: "locationType",
        headerName: "Source/Destination",
        flex: 0.75,
        minWidth: 150,
        renderCell: (params: { row: PublicSchedule }) => renderScheduleLocationType(params.row),
      },
      {
        field: "periodMinutes",
        headerName: "Period",
        flex: 0.65,
        minWidth: 130,
        valueGetter: (params: { row: PublicSchedule }) => getSchedulePeriodLabel(params.row.periodMinutes),
      },
      {
        field: "minuteOfHour",
        headerName: "Minute",
        flex: 0.45,
        minWidth: 90,
        valueGetter: (params: { row: PublicSchedule }) => `:${String(params.row.minuteOfHour).padStart(2, "0")}`,
      },
      {
        field: "enabled",
        headerName: "Enabled",
        flex: 0.5,
        minWidth: 100,
        renderCell: (params: { row: PublicSchedule }) => <Text>{params.row.enabled ? "Yes" : "No"}</Text>,
      },
      {
        field: "nextRunAt",
        headerName: "Next Run",
        flex: 0.85,
        minWidth: 160,
        valueGetter: (params: { row: PublicSchedule }) => formatDateLocal(params.row.nextRunAt),
      },
    ],
    [renderScheduleLocationType]
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
              isSchedulesAvailable,
              schedulesUnavailableReason: `Schedules are available only for ${scheduleAllowedTiers.join(" and ")} tiers`,
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
        maxWidth={dialog.type === "schedules" ? "900px" : "550px"}
        PaperProps={{
          component: "form",
          onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());

            if (dialog.type === "schedules") {
              if (!scheduleFormOpen) {
                return;
              }

              if (!isSchedulesAvailable) {
                snackbar.showError("Schedules are not available for this plan");
                return;
              }

              if (!canCreateSelectedScheduleType) {
                snackbar.showError(
                  scheduleType === "RDBImport"
                    ? "Only one import schedule can be created per instance"
                    : `Only ${maxExportSchedules} export schedules can be created per instance`
                );
                return;
              }

              let schedule: CreateScheduleRequestBody;

              try {
                schedule = buildScheduleRequestBody(formJson, instanceId, scheduleType, scheduleExportTargetType);
              } catch {
                snackbar.showError("GCS credentials must be valid service account JSON");
                return;
              }

              await createScheduleMutation.mutateAsync({ schedule });
              await refetchSchedules();
              setScheduleFormOpen(false);
              setScheduleType("RDBExport");
              setScheduleExportTargetType("gcs");
              return;
            }

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
              {dialog.type === "schedules" ? "RDB schedules" : dialog.type === "export" ? "Export RDB" : "Import RDB"}
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
            {dialog.type === "import" && (
              <Text size="small" weight="semibold" color="#EF4444">
                Caution: Your instance will be erased before the import takes place.
              </Text>
            )}
            {dialog.type === "schedules" && (
              <Stack gap="16px">
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap="12px">
                  <Text size="small" weight="regular" color="#344054">
                    Manage recurring RDB import and export schedules for this instance.
                  </Text>
                  <Button
                    type="button"
                    variant="contained"
                    onClick={openCreateScheduleForm}
                    disabled={
                      createScheduleMutation.isPending || (!canCreateExportSchedule && !canCreateImportSchedule)
                    }
                  >
                    {scheduleFormOpen ? "Hide form" : "Create schedule"}
                  </Button>
                </Stack>
                {scheduleFormOpen && (
                  <Box
                    sx={{
                      border: "1px solid #EAECF0",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <FieldContainer>
                      <FieldLabel required>Schedule type</FieldLabel>
                      <RadioGroup
                        row
                        name="scheduleType"
                        value={scheduleType}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setScheduleType(event.target.value as ScheduleType)
                        }
                      >
                        <FormControlLabel
                          value="RDBExport"
                          control={<Radio />}
                          label="Export"
                          disabled={!canCreateExportSchedule}
                        />
                        <FormControlLabel
                          value="RDBImport"
                          control={<Radio />}
                          label="Import"
                          disabled={!canCreateImportSchedule}
                        />
                      </RadioGroup>
                      {!canCreateExportSchedule && (
                        <Text size="small" weight="regular" color="#667085">
                          This instance already has the maximum number of export schedules ({maxExportSchedules}).
                        </Text>
                      )}
                      {!canCreateImportSchedule && (
                        <Text size="small" weight="regular" color="#667085">
                          This instance already has an import schedule.
                        </Text>
                      )}
                    </FieldContainer>
                    <Stack direction={{ xs: "column", md: "row" }} gap="12px">
                      <FieldContainer>
                        <FieldLabel required>Period minutes</FieldLabel>
                        <TextField
                          required
                          type="number"
                          id="schedulePeriodMinutes"
                          name="schedulePeriodMinutes"
                          defaultValue={60}
                          inputProps={{ min: 60, step: 15 }}
                          fullWidth
                          sx={{ mt: 0 }}
                        />
                      </FieldContainer>
                      <FieldContainer>
                        <FieldLabel required>Minute of hour</FieldLabel>
                        <Select id="scheduleMinuteOfHour" name="scheduleMinuteOfHour" defaultValue={0} fullWidth>
                          <MenuItem value={0}>:00</MenuItem>
                          <MenuItem value={15}>:15</MenuItem>
                          <MenuItem value={30}>:30</MenuItem>
                          <MenuItem value={45}>:45</MenuItem>
                        </Select>
                      </FieldContainer>
                      <FieldContainer>
                        <FieldLabel>Failure threshold</FieldLabel>
                        <TextField
                          type="number"
                          id="scheduleFailureThreshold"
                          name="scheduleFailureThreshold"
                          placeholder="1"
                          inputProps={{ min: 1 }}
                          fullWidth
                          sx={{ mt: 0 }}
                        />
                      </FieldContainer>
                    </Stack>
                    {scheduleType === "RDBExport" && (
                      <FieldContainer>
                        <Stack direction="row" alignItems="center" gap="6px">
                          <FieldLabel required>Destination</FieldLabel>
                          <Text size="small" weight="semibold" color="#667085">
                            beta
                          </Text>
                        </Stack>
                        <RadioGroup
                          row
                          name="scheduleExportTargetType"
                          value={scheduleExportTargetType}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setScheduleExportTargetType(event.target.value as RDBScheduleExportTargetType)
                          }
                        >
                          <FormControlLabel value="gcs" control={<Radio />} label="Google Cloud Storage" />
                          <FormControlLabel value="s3" control={<Radio />} label="Amazon S3" />
                        </RadioGroup>
                      </FieldContainer>
                    )}
                    {scheduleType === "RDBImport" && (
                      <FieldContainer>
                        <Stack direction="row" alignItems="center" gap="6px">
                          <FieldLabel required>Source</FieldLabel>
                          <Text size="small" weight="semibold" color="#667085">
                            beta
                          </Text>
                        </Stack>
                        <Text size="small" weight="regular" color="#667085">
                          Scheduled imports can only use another running instance as the source.
                        </Text>
                      </FieldContainer>
                    )}
                    {scheduleType === "RDBExport" && scheduleExportTargetType === "gcs" && (
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
                    {scheduleType === "RDBExport" && scheduleExportTargetType === "s3" && (
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
                    {scheduleType === "RDBImport" && (
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
                    )}
                  </Box>
                )}
                <DataGrid
                  getRowId={(row) => row.scheduleId}
                  columns={scheduleColumns}
                  rows={isSchedulesRefetching ? [] : schedulesData}
                  loading={isSchedulesLoading || isSchedulesRefetching}
                  noRowsText="No schedules"
                  sx={{
                    "& .MuiDataGrid-main": {
                      minHeight: "260px",
                    },
                    borderRadius: "8px",
                  }}
                />
              </Stack>
            )}
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
                      Select a running instance you can access as the source for this import.
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
            disabled={exportMutation.isPending || importMutation.isPending || createScheduleMutation.isPending}
          >
            {dialog.type === "schedules" ? "Close" : "Cancel"}
          </Button>
          {dialog.type === "schedules" && scheduleFormOpen && (
            <Button
              variant="contained"
              type="submit"
              disabled={createScheduleMutation.isPending || !canCreateSelectedScheduleType}
            >
              Create Schedule
            </Button>
          )}
          {dialog.type !== "schedules" && (
            <Button variant="contained" type="submit" disabled={exportMutation.isPending || importMutation.isPending}>
              {dialog.type === "export" ? "Export" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </InformationDialogTopCenter>
    </>
  );
}

export default ResourceImportExportRDB;
