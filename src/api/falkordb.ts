import axios, { AxiosProgressEvent, AxiosResponse } from "axios";

import { TaskBase } from "src/components/ResourceInstance/ImportExportRDB/hooks/useTasks";

const axiosInstance = axios.create({
  baseURL: "/api/falkordb",
});

export const getInstanceTasks = (instanceId: string, config = {}) => {
  return axiosInstance.get<{ data: TaskBase[] }>(`/db-importer/tasks?instanceId=${instanceId}`, {
    ...config,
  });
};

export type GCPServiceAccountKey = {
  type: "service_account";
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
};

export type RDBExportTarget =
  | { type?: "default" }
  | { type: "gcs"; bucketName: string; credentials: GCPServiceAccountKey }
  | {
      type: "s3";
      bucketName: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };

export type RDBExportScheduleTarget = Exclude<RDBExportTarget, { type?: "default" }>;

export type RDBImportSource =
  | { type: "gcs"; bucketName: string; fileName: string; credentials: GCPServiceAccountKey }
  | { type: "url"; url: string }
  | { type: "instance"; instanceId: string }
  | {
      type: "s3";
      bucketName: string;
      key: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };

export type RDBImportInstanceSource = Extract<RDBImportSource, { type: "instance" }>;

export type ScheduleType = "RDBExport" | "RDBImport";

export type ScheduleMinuteOfHour = 0 | 15 | 30 | 45;

export type CreateScheduleRequestBody =
  | {
      type: "RDBExport";
      payload: {
        instanceId: string;
        target: RDBExportScheduleTarget;
      };
      periodMinutes: number;
      minuteOfHour: ScheduleMinuteOfHour;
      failureThreshold?: number;
    }
  | {
      type: "RDBImport";
      payload: {
        instanceId: string;
        source: RDBImportInstanceSource;
      };
      periodMinutes: number;
      minuteOfHour: ScheduleMinuteOfHour;
      failureThreshold?: number;
    };

export type PublicSchedule = {
  scheduleId: string;
  requestorId: string;
  type: ScheduleType;
  payload:
    | {
        instanceId: string;
        target?: RDBExportTarget;
      }
    | {
        instanceId: string;
        source?: RDBImportSource;
      };
  periodMinutes: number;
  minuteOfHour: ScheduleMinuteOfHour;
  failureThreshold: number;
  enabled: boolean;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ListSchedulesResponseBody = {
  data: PublicSchedule[];
};

export type CreateScheduleResponseBody = {
  schedule: PublicSchedule;
};

export const postInstanceExportRdb = (instanceId: string, target?: RDBExportTarget, config = {}) => {
  return axiosInstance.post(
    `/db-importer/export`,
    {
      instanceId,
      target,
    },
    {
      ...config,
    }
  );
};

export const postInstanceImportRdbRequestURL = (instanceId: string, source?: RDBImportSource, config = {}) => {
  return axiosInstance
    .post<any, AxiosResponse<{ taskId: string; uploadUrl?: string }>>(
      `/db-importer/import/request-url`,
      {
        instanceId,
        source,
      },
      {
        ...config,
      }
    )
    .then((res) => res.data);
};

export const postInstanceImportRdbConfirmUpload = (instanceId: string, taskId: string, config = {}) => {
  return axiosInstance.post<any, { taskId: string; uploadUrl: string }>(
    `/db-importer/import/confirm-upload`,
    {
      instanceId,
      taskId,
    },
    {
      ...config,
    }
  );
};

export const getSchedules = (params: { instanceId?: string; type?: ScheduleType } = {}, config = {}) => {
  return axiosInstance.get<ListSchedulesResponseBody>(`/db-importer/schedules`, {
    params,
    ...config,
  });
};

export const postSchedule = (data: CreateScheduleRequestBody, config = {}) => {
  return axiosInstance
    .post<any, AxiosResponse<CreateScheduleResponseBody>>(`/db-importer/schedules`, data, {
      ...config,
    })
    .then((res) => res.data);
};

export const uploadFile = (
  url: string,
  file: ArrayBuffer,
  progressCallback?: (progressEvent: AxiosProgressEvent) => void,
  config: any = {}
) => {
  return axios.create().put(url, file, {
    ...config,
    headers: {
      ...config?.headers,
      "Content-Type": "application/octet-stream",
    },
    onUploadProgress: (progressEvent) => progressCallback && progressCallback(progressEvent),
  });
};

// --- Customer LDAP (User Access) ---

const ldapAxiosInstance = axios.create({
  baseURL: "/api/falkordb-ldap",
});

export type UserACL = {
  username: string;
  acl: string;
};

export type UsersResponse = {
  users: UserACL[];
};

export const getInstanceUsers = (instanceId: string, subscriptionId: string, config = {}) => {
  return ldapAxiosInstance.get<UsersResponse>(`/instances/${instanceId}/users`, {
    params: { subscriptionId },
    ...config,
  });
};

export const createInstanceUser = (
  instanceId: string,
  subscriptionId: string,
  data: { username: string; password: string; acl: string },
  config = {}
) => {
  return ldapAxiosInstance.post<{ message: string }>(`/instances/${instanceId}/users`, data, {
    params: { subscriptionId },
    ...config,
  });
};

export const updateInstanceUser = (
  instanceId: string,
  subscriptionId: string,
  username: string,
  data: { password?: string; acl?: string },
  config = {}
) => {
  return ldapAxiosInstance.put<{ message: string }>(`/instances/${instanceId}/users/${username}`, data, {
    params: { subscriptionId },
    ...config,
  });
};

export const deleteInstanceUser = (instanceId: string, subscriptionId: string, username: string, config = {}) => {
  return ldapAxiosInstance.delete<{ message: string }>(`/instances/${instanceId}/users/${username}`, {
    params: { subscriptionId },
    ...config,
  });
};
