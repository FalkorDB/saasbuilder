import { AxiosResponse } from "axios";

import { ListAllSubscriptionUsersSuccessResponse } from "src/types/consumptionUser";

import axios from "../axios";

export const revokeSubscriptionUser = (subscriptionId, payload) =>
  axios.delete(`/resource-instance/subscription/${subscriptionId}/revoke-user-role`, {
    data: payload,
  });

export const inviteSubscriptionUser = (subscriptionId, payload, suppressErrorSnackbar = false) =>
  axios.post(`/resource-instance/subscription/${subscriptionId}/invite-user`, payload, {
    ignoreGlobalErrorSnack: suppressErrorSnackbar,
  });

export const getUsersBySubscription = (subscriptionId) =>
  axios.get(`/resource-instance/subscription/${subscriptionId}/subscription-users`);

export const updateProfile = async (userId, data) => {
  return axios.patch(`/user/${userId}`, data);
};

export const updatePassword = (payload) => {
  return axios.post(`/update-password`, payload);
};

export const getAllSubscriptionUsers = (
  params = {}
): Promise<AxiosResponse<ListAllSubscriptionUsersSuccessResponse>> => {
  return axios.get(`/resource-instance/subscription-users`, { params });
};

export const deleteUser = (): Promise<AxiosResponse<any>> => {
  return axios.delete(`/customer-delete-user`);
};
