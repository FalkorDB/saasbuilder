"use client";

import { useFormik } from "formik";
import { Box, Stack } from "@mui/material";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import Tooltip from "components/Tooltip/Tooltip";
import DataTable from "components/DataTable/DataTable";
import AwsLogo from "components/Logos/AwsLogo/AwsLogo";
import GcpLogo from "components/Logos/GcpLogo/GcpLogo";
import StatusChip from "components/StatusChip/StatusChip";
import DataGridText from "components/DataGrid/DataGridText";
import AzureLogo from "components/Logos/AzureLogo/AzureLogo";
import ServiceNameWithLogo from "components/ServiceNameWithLogo/ServiceNameWithLogo";
import ViewInstructionsIcon from "components/Icons/AccountConfig/ViewInstrcutionsIcon";
import CloudProviderAccountOrgIdModal from "components/CloudProviderAccountOrgIdModal/CloudProviderAccountOrgIdModal";
import DeleteAccountConfigConfirmationDialog from "components/DeleteAccountConfigConfirmationDialog/DeleteAccountConfigConfirmationDialog";

import PageTitle from "../components/Layout/PageTitle";
import useInstances from "../instances/hooks/useInstances";
import CloudAccountForm from "./components/CloudAccountForm";
import PageContainer from "../components/Layout/PageContainer";
import CloudAccountsIcon from "../components/Icons/CloudAccountsIcon";
import CloudAccountsTableHeader from "./components/CloudAccountsTableHeader";
import FullScreenDrawer from "../components/FullScreenDrawer/FullScreenDrawer";

import useSnackbar from "src/hooks/useSnackbar";
import formatDateUTC from "src/utils/formatDateUTC";
import { ResourceInstance } from "src/types/resourceInstance";
import { useGlobalData } from "src/providers/GlobalDataProvider";
import {
  deleteResourceInstance,
  getTerraformKit,
} from "src/api/resourceInstance";
import { getResourceInstanceStatusStylesAndLabel } from "src/constants/statusChipStyles/resourceInstanceStatus";
import { getCloudAccountsRoute } from "src/utils/routes";
import { isCloudAccountInstance } from "src/utils/access/byoaResource";
import {
  getGcpBootstrapShellCommand,
  getGcpShellScriptOffboardCommand,
} from "src/utils/accountConfig/accountConfig";

const columnHelper = createColumnHelper<ResourceInstance>();

type Overlay =
  | "delete-dialog"
  | "create-instance-form"
  | "view-instance-form"
  | "view-instructions-dialog";

const CloudAccountsPage = () => {
  const snackbar = useSnackbar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams?.get("serviceId");
  const servicePlanId = searchParams?.get("servicePlanId");
  const subscriptionId = searchParams?.get("subscriptionId");

  const { subscriptionsObj, serviceOfferingsObj } = useGlobalData();
  const [initialFormValues, setInitialFormValues] = useState<any>();
  const [searchText, setSearchText] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [overlayType, setOverlayType] = useState<Overlay>(
    "create-instance-form"
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isAccountCreation, setIsAccountCreation] = useState(false);
  const [clickedInstance, setClickedInstance] = useState<ResourceInstance>();

  const gcpBootstrapShellCommand = useMemo(() => {
    const result_params: any = clickedInstance?.result_params;
    if (result_params?.cloud_provider_account_config_id) {
      return getGcpBootstrapShellCommand(
        result_params?.cloud_provider_account_config_id
      );
    }
  }, [clickedInstance]);

  const accountInstructionDetails = useMemo(() => {
    const result_params: any = clickedInstance?.result_params;
    let details = {};
    if (result_params?.aws_account_id) {
      details = {
        awsAccountID: result_params?.aws_account_id,
      };
    } else if (result_params?.gcp_project_id) {
      details = {
        gcpProjectID: result_params?.gcp_project_id,
        gcpProjectNumber: result_params?.gcp_project_number,
      };
    }
    return details;
  }, [clickedInstance]);

  const {
    data: instances = [],
    isLoading: isLoadingInstances,
    isFetching: isFetchingInstances,
    refetch: refetchInstances,
  } = useInstances();

  // Open the Create Form Overlay when serviceId, servicePlanId and subscriptionId are present in the URL
  useEffect(() => {
    if (serviceId && servicePlanId && subscriptionId) {
      setOverlayType("create-instance-form");
      setIsOverlayOpen(true);
      setInitialFormValues({
        serviceId,
        servicePlanId,
        subscriptionId,
      });
      router.replace(getCloudAccountsRoute({}));
    }
  }, [serviceId, servicePlanId, subscriptionId]);

  const byoaInstances = useMemo(() => {
    const res = instances.filter((instance) =>
      isCloudAccountInstance(instance)
    );

    if (searchText) {
      return res.filter(
        (instance) =>
          // @ts-ignore
          instance.result_params?.gcp_project_id
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||
          // @ts-ignore
          instance.result_params?.aws_account_id
            ?.toLowerCase()
            .includes(searchText.toLowerCase())
      );
    }

    return res;
  }, [instances, searchText]);

  const dataTableColumns = useMemo(() => {
    return [
      columnHelper.accessor(
        (row) =>
          // @ts-ignore
          row.result_params?.gcp_project_id ||
          // @ts-ignore
          row.result_params?.aws_account_id ||
          "-",
        {
          id: "account_id",
          header: "Account ID / Project ID",
          cell: (data) => {
            const value =
              // @ts-ignore
              data.row.original.result_params?.gcp_project_id ||
              // @ts-ignore
              data.row.original.result_params?.aws_account_id ||
              "-";

            return (
              <DataGridText
                showCopyButton={value !== "-"}
                style={{
                  fontWeight: 600,
                }}
              >
                {value}
              </DataGridText>
            );
          },
          meta: {
            minWidth: 200,
          },
        }
      ),
      columnHelper.accessor("status", {
        id: "status",
        header: "Lifecycle Status",
        cell: (data) => {
          const status = data.row.original.status;
          const statusSytlesAndLabel = getResourceInstanceStatusStylesAndLabel(
            status as string
          );
          const showInstructions = [
            "VERIFYING",
            "PENDING",
            "PENDING_DEPENDENCY",
            "UNKNOWN",
            "DEPLOYING",
            "READY",
            "FAILED",
          ].includes(status as string);

          return (
            <Stack
              direction="row"
              alignItems="center"
              gap="6px"
              width="94px"
              justifyContent="space-between"
            >
              <StatusChip status={status} {...statusSytlesAndLabel} />
              {showInstructions && (
                <Tooltip
                  title="View account configuration instructions"
                  placement="top"
                >
                  <Box
                    sx={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={() => {
                      setClickedInstance(data.row.original);
                      setIsOverlayOpen(true);
                      setOverlayType("view-instructions-dialog");
                    }}
                  >
                    <ViewInstructionsIcon />
                  </Box>
                </Tooltip>
              )}
            </Stack>
          );
        },
        meta: {
          minWidth: 170,
        },
      }),
      columnHelper.accessor(
        (row) => {
          const subscription = subscriptionsObj[row.subscriptionId as string];
          return subscription?.serviceName;
        },
        {
          id: "serviceName",
          header: "Service Name",
          cell: (data) => {
            const { serviceLogoURL, serviceName } =
              subscriptionsObj[data.row.original.subscriptionId as string] ||
              {};
            return (
              <ServiceNameWithLogo
                serviceName={serviceName}
                serviceLogoURL={serviceLogoURL}
              />
            );
          },
          meta: {
            minWidth: 230,
          },
        }
      ),
      columnHelper.accessor(
        (row) => {
          const subscription = subscriptionsObj[row.subscriptionId as string];
          return subscription?.productTierName || "-";
        },
        {
          id: "servicePlanName",
          header: "Subscription Plan",
        }
      ),

      columnHelper.accessor(
        // @ts-ignore
        (row) => row.cloud_provider || row.result_params?.cloud_provider || "-",
        {
          id: "cloud_provider",
          header: "Provider",
          cell: (data) => {
            const cloudProvider =
              // @ts-ignore
              data.row.original.result_params?.gcp_project_id ? "gcp" : "aws";

            return cloudProvider === "aws" ? (
              <AwsLogo />
            ) : cloudProvider === "gcp" ? (
              <GcpLogo />
            ) : cloudProvider === "azure" ? (
              <AzureLogo />
            ) : (
              "-"
            );
          },
        }
      ),
      columnHelper.accessor(
        (row) => {
          const subscription = subscriptionsObj[row.subscriptionId as string];
          return subscription?.subscriptionOwnerName;
        },
        {
          id: "subscriptionOwner",
          header: "Subscription Owner",
        }
      ),
      columnHelper.accessor((row) => formatDateUTC(row.created_at), {
        id: "created_at",
        header: "Created On",
        cell: (data) => {
          return data.row.original.created_at
            ? formatDateUTC(data.row.original.created_at)
            : "-";
        },
        meta: {
          minWidth: 225,
        },
      }),
    ];
  }, [subscriptionsObj]);

  const selectedInstance = useMemo(() => {
    return instances.find((instance) => instance.id === selectedRows[0]);
  }, [selectedRows, instances]);

  const deleteAccountInstructionDetails = useMemo(() => {
    const result_params: any = selectedInstance?.result_params;
    let details: any = {};
    if (result_params?.aws_account_id) {
      details = {
        awsAccountID: result_params?.aws_account_id,
      };
    } else if (result_params?.gcp_project_id) {
      details = {
        gcpProjectID: result_params?.gcp_project_id,
        gcpProjectNumber: result_params?.gcp_project_number,
      };
      if (result_params?.cloud_provider_account_config_id) {
        details.gcpOffboardCommand = getGcpShellScriptOffboardCommand(
          result_params?.cloud_provider_account_config_id
        );
      }
    }
    return details;
  }, [selectedInstance]);

  // Subscription of the Selected Instance
  const selectedInstanceSubscription = useMemo(() => {
    return subscriptionsObj[selectedInstance?.subscriptionId as string];
  }, [selectedInstance, subscriptionsObj]);

  // Offering of the Selected Instance
  const selectedInstanceOffering = useMemo(() => {
    const { serviceId, productTierId } = selectedInstanceSubscription || {};
    return serviceOfferingsObj[serviceId]?.[productTierId];
  }, [selectedInstanceSubscription, serviceOfferingsObj]);

  // Resource
  const selectedResource = useMemo(() => {
    return selectedInstanceOffering?.resourceParameters?.find((resource) =>
      resource.resourceId.startsWith("r-injectedaccountconfig")
    );
  }, [selectedInstanceOffering?.resourceParameters]);

  const deleteAccountConfigMutation = useMutation(
    () => {
      const requestPayload = {
        serviceProviderId: selectedInstanceOffering?.serviceProviderId,
        serviceKey: selectedInstanceOffering?.serviceURLKey,
        serviceAPIVersion: selectedInstanceOffering?.serviceAPIVersion,
        serviceEnvironmentKey:
          selectedInstanceOffering?.serviceEnvironmentURLKey,
        serviceModelKey: selectedInstanceOffering?.serviceModelURLKey,
        productTierKey: selectedInstanceOffering?.productTierURLKey,
        resourceKey: selectedResource?.urlKey,
        id: selectedInstance?.id,
        subscriptionId: selectedInstance?.subscriptionId,
      };
      return deleteResourceInstance(requestPayload);
    },
    {
      onSuccess: () => {
        setSelectedRows([]);
        refetchInstances();
        setIsOverlayOpen(false);
        snackbar.showSuccess("Deleting account config...");

        // eslint-disable-next-line no-use-before-define
        deleteformik.resetForm();
      },
    }
  );

  const deleteformik = useFormik({
    initialValues: {
      deleteme: "",
    },
    onSubmit: (values) => {
      if (!selectedInstance) return snackbar.showError("No instance selected");
      if (!selectedResource) return snackbar.showError("Resource not found");

      if (values.deleteme === "deleteme") {
        deleteAccountConfigMutation.mutate();
      } else {
        snackbar.showError("Please enter deleteme");
      }
    },
    validateOnChange: false,
  });

  const clickedInstanceSubscription = useMemo(() => {
    return subscriptionsObj[clickedInstance?.subscriptionId as string];
  }, [clickedInstance, subscriptionsObj]);

  const clickedInstanceOffering = useMemo(() => {
    const { serviceId, productTierId } = clickedInstanceSubscription || {};
    return serviceOfferingsObj[serviceId]?.[productTierId];
  }, [clickedInstanceSubscription, serviceOfferingsObj]);

  const downloadTerraformKitMutation = useMutation(
    () => {
      if (clickedInstanceOffering && clickedInstanceSubscription) {
        return getTerraformKit(
          clickedInstanceOffering.serviceProviderId,
          clickedInstanceOffering.serviceURLKey,
          clickedInstanceOffering.serviceAPIVersion,
          clickedInstanceOffering.serviceEnvironmentURLKey,
          clickedInstanceOffering.serviceModelURLKey,
          clickedInstanceSubscription.id,
          // @ts-ignore
          clickedInstance?.result_params?.gcp_project_id ? "gcp" : "aws"
        );
      }
    },
    {
      onSuccess: (response: any) => {
        if (!response?.data) {
          return snackbar.showError("Failed to download terraform kit");
        }
        const href = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = href;
        link.setAttribute("download", "terraformkit.tar");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
      },
    }
  );

  useEffect(() => {
    if (isAccountCreation) {
      setIsOverlayOpen(true);
      setOverlayType("view-instructions-dialog");
    }
  }, [isAccountCreation]);

  return (
    <PageContainer>
      <PageTitle icon={CloudAccountsIcon} className="mb-6">
        Cloud Accounts
      </PageTitle>

      <div>
        <DataTable
          columns={dataTableColumns}
          rows={byoaInstances}
          noRowsText="No cloud accounts"
          HeaderComponent={CloudAccountsTableHeader}
          headerProps={{
            count: byoaInstances.length,
            searchText,
            setSearchText,
            onCreateClick: () => {
              setSelectedRows([]);
              setIsOverlayOpen(true);
              setOverlayType("create-instance-form");
            },
            onDeleteClick: () => {
              setIsOverlayOpen(true);
              setOverlayType("delete-dialog");
            },
            selectedInstance,
            refetchInstances: refetchInstances,
            isFetchingInstances: isFetchingInstances,
          }}
          isLoading={isLoadingInstances}
          selectionMode="single"
          selectedRows={selectedRows}
          onRowSelectionChange={setSelectedRows}
        />
      </div>

      <FullScreenDrawer
        title="Cloud Account"
        description="Create a new cloud account"
        open={
          isOverlayOpen &&
          (overlayType === "create-instance-form" ||
            overlayType === "view-instance-form")
        }
        closeDrawer={() => {
          setIsOverlayOpen(false);
          setClickedInstance(undefined);
        }}
        RenderUI={
          <CloudAccountForm
            initialFormValues={initialFormValues}
            selectedInstance={selectedInstance}
            onClose={() => {
              setIsOverlayOpen(false);
            }}
            formMode={overlayType === "view-instance-form" ? "view" : "create"}
            setIsAccountCreation={setIsAccountCreation}
            setOverlayType={setOverlayType}
            setClickedInstance={setClickedInstance}
          />
        }
      />

      <DeleteAccountConfigConfirmationDialog
        open={isOverlayOpen && overlayType === "delete-dialog"}
        handleClose={() => {
          setIsOverlayOpen(false);
          deleteformik.resetForm();
        }}
        formData={deleteformik}
        title="Delete Account Config"
        isLoading={deleteAccountConfigMutation.isLoading}
        accountInstructionDetails={deleteAccountInstructionDetails}
      />

      <CloudProviderAccountOrgIdModal
        isAccessPage
        open={isOverlayOpen && overlayType === "view-instructions-dialog"}
        handleClose={() => {
          setIsOverlayOpen(false);
          setClickedInstance(undefined);
          setIsAccountCreation(false);
        }}
        accountConfigId={clickedInstance?.id}
        selectedAccountConfig={clickedInstance}
        cloudFormationTemplateUrl={
          clickedInstanceOffering?.assets?.cloudFormationURL
        }
        isAccountCreation={isAccountCreation}
        gcpBootstrapShellCommand={gcpBootstrapShellCommand}
        accountInstructionDetails={accountInstructionDetails}
        downloadTerraformKitMutation={downloadTerraformKitMutation}
        orgId={clickedInstanceSubscription?.accountConfigIdentityId}
        accountConfigMethod={
          // @ts-ignore
          clickedInstance?.result_params?.account_configuration_method
        }
      />
    </PageContainer>
  );
};

export default CloudAccountsPage;
