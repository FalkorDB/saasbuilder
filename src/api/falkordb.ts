import axios from 'axios';
import Cookies from 'js-cookie';
import { getProviderToken } from 'src/server/providerToken';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FALKORDB_API_BASE_URL,
  headers: {
    Authorization: "Bearer " + Cookies.get("token"),
  },
})

axios.interceptors.request.use((config) => {
  config.headers.Authorization = "Bearer " + Cookies.get("token")
  return config;
});

export const getInstanceTasks = (
  instanceId: string,
  config = {}
) => {
  return axiosInstance.get(
    `/db-importer/tasks?instanceId=${instanceId}`,
    {
      ...config,
    }
  )
}

export const postInstanceExportRdb = (
  instanceId: string,
  username: string,
  password: string,
  config = {}
) => {
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
  )
}