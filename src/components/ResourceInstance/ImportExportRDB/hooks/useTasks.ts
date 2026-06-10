import { useQuery, UseQueryOptions } from "@tanstack/react-query";
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
      type?: string;
      expiresIn?: number;
    };
    source?: {
      instanceId?: string;
      type?: string;
    };
  };
  output?: {
    readUrl?: string;
    numberOfKeys?: number;
  };
  errors?: string[];
};

export type TasksResponse = {
  data: TaskBase[];
  page: number;
  pageSize: number;
  total: number;
};

function useTasks(
  queryParams: QueryParams,
  queryOptions: UseQueryOptions<AxiosResponse<{ data: TaskBase[] }>, unknown, TaskBase[]> = {
    queryKey: ["get-instance-tasks"],
  }
) {
  const { instanceId } = queryParams;

  const query = useQuery({
    queryFn: async () => {
      const response = await getInstanceTasks(instanceId);
      return response;
    },
    refetchOnWindowFocus: false,
    retry: false,
    refetchOnMount: true,
    refetchInterval: 30000,
    select: (response) => response.data.data,
    ...queryOptions,
  });

  return query;
}

export default useTasks;
