import axios from "../axios";

export function getResourceInstanceEvents(resourceInstanceId, subscriptionId) {
  const queryParams = {};

  if (subscriptionId) {
    queryParams.subscriptionId = subscriptionId;
  }

  return axios.get(`/resource-instance/${resourceInstanceId}/audit-events`, {
    params: queryParams,
  });
}

export function getEvent(eventId, subscriptionId) {
  const queryParams = {};

  if (subscriptionId) {
    queryParams.subscriptionId = subscriptionId;
  }
  return axios.get(`/resource-instance/audit-events/${eventId}`, {
    params: queryParams,
  });
}

export function getAllEvents(
  serviceProviderId,
  serviceURLKey,
  serviceAPIVersion,
  serviceEnvironmentURLKey,
  serviceModelURLKey,
  productTierURLKey,
  subscriptionId
) {
  const queryParams = {};

  if (subscriptionId) {
    queryParams.subscriptionId = subscriptionId;
  }
  return axios.get(
    `/resource-instance/${serviceProviderId}/${serviceURLKey}/${serviceAPIVersion}/${serviceEnvironmentURLKey}/${serviceModelURLKey}/${productTierURLKey}/audit-events`,
    {
      params: queryParams,
    }
  );
}
