import { useQuery } from "@tanstack/react-query";
import useEnvironmentType from "../useEnvironmentType";

import { getSubscriptions } from "src/api/subscriptions";

// Before Making any Changes, Please Be Careful because we use the QueryClient to Update the Data when Unsubscribing
const useSubscriptions = (queryOptions = {}) => {
  const environmentType = useEnvironmentType();
  const subscriptionData = useQuery(
    ["user-subscriptions"],
    () => {
      return getSubscriptions({
        environmentType,
      });
    },
    {
      select: (data) => {
        return data.data.subscriptions;
      },
      ...queryOptions,
    }
  );

  return subscriptionData;
};

export default useSubscriptions;
