import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

import { getInstanceUsers, UsersResponse, UserACL } from "src/api/falkordb";

type QueryParams = {
  instanceId: string;
  subscriptionId: string;
};

function useUsers(
  queryParams: QueryParams,
  queryOptions: UseQueryOptions<AxiosResponse<UsersResponse>, unknown, UserACL[]> = {
    queryKey: ["get-instance-users"],
  }
) {
  const { instanceId, subscriptionId } = queryParams;

  const query = useQuery({
    queryFn: async () => {
      const response = await getInstanceUsers(instanceId, subscriptionId);
      return response;
    },
    refetchOnWindowFocus: false,
    retry: false,
    refetchOnMount: true,
    refetchInterval: 30000,
    select: (response) => response.data.users,
    enabled: !!instanceId && !!subscriptionId,
    ...queryOptions,
  });

  return query;
}

export default useUsers;
