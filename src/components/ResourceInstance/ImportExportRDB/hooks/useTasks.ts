import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

import { getInstanceTasks } from "src/api/falkordb";

type QueryParams = {
  instanceId: string;
};

export type TaskBase = {
  taskId: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payload?: {
    destination?: {
      expiresIn?: number;
    };
  };
  output?: {
    readUrl?: string;
    numberOfKeys?: number;
  };
  error?: string;
};

export type TasksResponse = {
  data: TaskBase[];
  page: number;
  pageSize: number;
  total: number;
};

function useTasks(
  queryParams: QueryParams,
  queryOptions: UseQueryOptions<AxiosResponse<{ data: TaskBase[] }>, unknown, TaskBase[]> = {}
) {
  const { instanceId } = queryParams;

  const query: UseQueryResult<TaskBase[]> = useQuery<AxiosResponse<{ data: TaskBase[] }>, unknown, TaskBase[]>(
    ["instanceRestore", instanceId],
    () => {
      return getInstanceTasks(instanceId);
    },
    {
      refetchOnWindowFocus: false,
      retry: false,
      refetchOnMount: true,
      refetchInterval: 30000,
      onError: () => { },
      select: (response) => {
        return response?.data?.data || [];
      },
      ...queryOptions,
    }
  );

  return query;
}

export default useTasks;
