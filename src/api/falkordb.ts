import axios, { AxiosResponse } from "axios";
import Cookies from "js-cookie";

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
  return axiosInstance.get(`/db-importer/tasks?instanceId=${instanceId}`, {
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

export const postInstanceImportRdbRequestURL = (instanceId: string, username: string, password: string, config = {}) => {
  return axiosInstance.post<any, AxiosResponse<{ taskId: string, uploadUrl: string }>>(
    `/db-importer/import/request-url`,
    {
      instanceId,
      username,
      password,
    },
    {
      ...config,
    }
  ).then(res => res.data);
};

export const postInstanceImportRdbConfirmUpload = (instanceId: string, taskId: string, config = {}) => {
  return axiosInstance.post<any, { taskId: string, uploadUrl: string }>(
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

export const uploadFile = (url: string, file: ArrayBuffer, config: any = {}) => {
  return axios.create().put(url, file, {
    ...config,
    headers: {
      ...config?.headers,
      "Content-Type": 'application/octet-stream',
    },
  })
}

