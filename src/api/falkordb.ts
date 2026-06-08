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

export type RDBImportSource =
  | { type: "gcs"; bucketName: string; fileName: string; credentials: GCPServiceAccountKey }
  | {
      type: "s3";
      bucketName: string;
      key: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };

export const postInstanceExportRdb = (
  instanceId: string,
  username: string,
  password: string,
  target?: RDBExportTarget,
  config = {}
) => {
  return axiosInstance.post(
    `/db-importer/export`,
    {
      instanceId,
      username,
      password,
      target,
    },
    {
      ...config,
    }
  );
};

export const postInstanceImportRdbRequestURL = (
  instanceId: string,
  username: string,
  password: string,
  source?: RDBImportSource,
  config = {}
) => {
  return axiosInstance
    .post<any, AxiosResponse<{ taskId: string; uploadUrl?: string }>>(
      `/db-importer/import/request-url`,
      {
        instanceId,
        username,
        password,
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
