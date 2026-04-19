import axios, { AxiosProgressEvent, AxiosResponse } from "axios";
import Cookies from "js-cookie";

import { TaskBase } from "src/components/ResourceInstance/ImportExportRDB/hooks/useTasks";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FALKORDB_API_BASE_URL,
  headers: {
    Authorization: "Bearer " + Cookies.get("token"),
  },
});

axios.interceptors.request.use((config) => {
  config.headers.Authorization = "Bearer " + Cookies.get("token");
  return config;
});

export const getInstanceTasks = (instanceId: string, config = {}) => {
  return axiosInstance.get<{ data: TaskBase[] }>(`/db-importer/tasks?instanceId=${instanceId}`, {
    ...config,
  });
};

export const postInstanceExportRdb = (instanceId: string, username: string, password: string, config = {}) => {
  return axiosInstance.post(
    `/db-importer/export`,
    {
      instanceId,
      username,
      password,
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
  config = {}
) => {
  return axiosInstance
    .post<any, AxiosResponse<{ taskId: string; uploadUrl: string }>>(
      `/db-importer/import/request-url`,
      {
        instanceId,
        username,
        password,
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
  baseURL: process.env.NEXT_PUBLIC_FALKORDB_LDAP_API_BASE_URL,
  withCredentials: true,
});

ldapAxiosInstance.interceptors.request.use((config) => {
  config.headers.Authorization = "Bearer " + Cookies.get("token");
  return config;
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
