import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useFormik } from "formik";
import { Box, Stack } from "@mui/material";
import DashboardLayout from "components/DashboardLayout/DashboardLayout";
import DataGrid, { selectSingleItem } from "components/DataGrid/DataGrid";
import TextConfirmationDialog from "components/TextConfirmationDialog/TextConfirmationDialog";
import formatDateUTC from "src/utils/formatDateUTC";
import DataGridHeader from "./components/DataGridHeader";
import { deleteSubscription } from "src/api/subscriptions";
import useSnackbar from "src/hooks/useSnackbar";
// import CloudProviderCell from "./components/CloudProviderCell"; - Removed for Now
import useUserSubscriptions from "src/hooks/query/useUserSubscriptions";
import {
  getResourceRouteWithoutEnv,
  getAPIDocsRoute,
  getMarketplaceRoute,
} from "src/utils/route/access/accessRoute";
import GridCellExpand from "src/components/GridCellExpand/GridCellExpand";
import SubscriptionTypeDirectIcon from "src/components/Icons/SubscriptionType/SubscriptionTypeDirectIcon";
import SubscriptionTypeInvitedIcon from "src/components/Icons/SubscriptionType/SubscriptionTypeInvitedIcon";
import MarketplaceServiceSidebar, {
  sidebarActiveOptions,
} from "src/components/MarketplaceServiceSidebar/MarketplaceServiceSidebar";
import useServiceOffering from "src/hooks/useServiceOffering";
import useSubscriptionForProductTierAccess from "src/hooks/query/useSubscriptionForProductTierAccess";
import DashboardHeaderIcon from "src/components/Icons/Dashboard/DashboardHeaderIcon";
import LogoHeader from "src/components/Headers/LogoHeader";

const MySubscriptions = () => {
  const {
    data: subscriptions = [],
    isFetching,
    refetch: refetchSubscriptions,
  } = useUserSubscriptions();

  const router = useRouter();

  const { serviceId, environmentId, productTierId, subscriptionId } =
    router.query;

  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState({});
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectionModel, setSelectionModel] = useState([]);
  const { data: serviceOffering, isLoading: isServiceOfferingLoading } =
    useServiceOffering(serviceId, productTierId);

  const subscriptionQuery = useSubscriptionForProductTierAccess(
    serviceId,
    productTierId,
    subscriptionId
  );

  const { data: subscriptionData = {} } = subscriptionQuery;

  const filteredSubscriptions = useMemo(() => {
    let list = subscriptions;
    list = subscriptions?.filter((item) =>
      item?.serviceName?.toLowerCase()?.includes(searchText?.toLowerCase())
    );
    if (typeFilter === "direct") {
      list = list?.filter((item) => item?.roleType === "root");
    } else if (typeFilter === "invited") {
      list = list?.filter((item) => item?.roleType !== "root");
    }
    return list;
  }, [searchText, typeFilter, subscriptions]);

  const snackbar = useSnackbar();

  useEffect(() => {
    if (selectionModel) {
      const subscription = filteredSubscriptions?.find(
        (item) => item.id === selectionModel[0]
      );
      setSelectedSubscription(subscription);
    }
  }, [filteredSubscriptions, selectionModel]);

  const viewResourceInstance = () => {
    if (selectedSubscription) {
      router.push(
        getResourceRouteWithoutEnv(
          selectedSubscription.serviceId,
          selectedSubscription.productTierId,
          selectedSubscription.id
        )
      );
    }
  };

  const columns = [
    {
      field: "serviceName",
      headerName: "Name",
      flex: 1,
      minWidth: 230,
      renderCell: (params) => {
        const { serviceLogoURL, serviceName, serviceId, productTierId, id } =
          params.row;
        return (
          <GridCellExpand
            justifyContent="left"
            value={serviceName || ""}
            textStyles={{
              color: "#6941C6",
              fontSize: "14px",
              lineHeight: "20px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onClick={() => {
              router.push(
                getResourceRouteWithoutEnv(serviceId, productTierId, id)
              );
            }}
            startIcon={
              <Box
                boxShadow="0px 1px 2px 0px #1018280D"
                borderRadius="50%"
                border="1px solid rgba(0, 0, 0, 0.08)"
                overflow="hidden"
                width="40px"
                height="40px"
                flexShrink={0}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  width="38"
                  height="38"
                  style={{ objectFit: "cover" }}
                  src={
                    serviceLogoURL ||
                    "/assets/images/dashboard/service/servicePlaceholder.png"
                  }
                  alt={serviceName}
                />
              </Box>
            }
          />
        );
      },
    },
    {
      field: "id",
      headerName: "ID",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "productTierName",
      headerName: "Service Plan",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "roleType",
      headerName: "Role",
      flex: 1,
      minWidth: 70,
      valueGetter: (params) => {
        const role = params.row.roleType;
        if (!role?.length) {
          return "";
        }
        return role.charAt(0).toUpperCase() + role.slice(1);
      },
    },
    {
      field: "createdAt",
      headerName: "Subscription Date",
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => formatDateUTC(params.row.createdAt),
    },
    {
      fieldName: "defaultSubscription",
      headerName: "Subscription Type",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        return (
          <GridCellExpand
            justifyContent="left"
            value={params.row.roleType === "root" ? "Direct" : "Invited"}
            startIcon={
              params.row.roleType === "root" ? (
                <SubscriptionTypeDirectIcon />
              ) : (
                <SubscriptionTypeInvitedIcon />
              )
            }
          />
        );
      },
    },
    {
      field: "subscriptionOwnerName",
      headerName: "Subscription Owner",
      flex: 1,
      minWidth: 120,
    },
    // {
    //   field: "defaultSubscription",
    //   headerName: "Action",
    //   width: 100,
    //   renderCell: (params) => {
    //     return (
    //       <>
    //         <IconButton
    //           onClick={(event) => onActionMenuClick(event, params.row)}
    //         >
    //           <MoreVertIcon />
    //         </IconButton>
    //         <Menu
    //           anchorOrigin={{
    //             vertical: "bottom",
    //             horizontal: "center",
    //           }}
    //           transformOrigin={{
    //             vertical: "top",
    //             horizontal: "right",
    //           }}
    //           anchorEl={anchorEl}
    //           open={
    //             Boolean(anchorEl) && params.row.id === selectedSubscription.id
    //           }
    //           onClose={() => setAnchorEl(null)}
    //           PaperProps={{
    //             style: {
    //               maxHeight: ITEM_HEIGHT * 4.5,
    //               width: "22ch",
    //             },
    //           }}
    //         >
    //           <MenuItem
    //             sx={{ gap: "8px" }}
    //             onClick={() => {
    //               setAnchorEl(null);
    //               viewResourceInstance();
    //             }}
    //           >
    //             <SpeedometerIcon />
    //             <Text size="small" weight="medium">
    //               Go To Dashboard
    //             </Text>
    //           </MenuItem>

    //           {/* Show Unsubscribe Only When It's Not a Default Subscription */}
    //           <MenuItem
    //             sx={{
    //               gap: "8px",
    //               display: params.row.defaultSubscription ? "none" : "flex",
    //             }}
    //             onClick={() => {
    //               setAnchorEl(null);
    //               setShowUnsubscribeDialog(true);
    //             }}
    //           >
    //             <BellRingingIcon />
    //             <Text size="small" weight="medium">
    //               Unsubscribe
    //             </Text>
    //           </MenuItem>
    //         </Menu>
    //       </>
    //     );
    //   },
    // },
  ];

  function handleUnsubscribeClick() {
    setShowUnsubscribeDialog(true);
  }

  const isCustomNetworkEnabled = useMemo(() => {
    let enabled = false;

    if (
      serviceOffering?.serviceModelFeatures?.find((featureObj) => {
        return featureObj.feature === "CUSTOM_NETWORKS";
      })
    )
      enabled = true;

    return enabled;
  }, [serviceOffering]);

  const servicePlanUrlLink = getMarketplaceRoute(
    serviceId,
    environmentId,
    productTierId
  );

  const serviceAPIDocsLink = getAPIDocsRoute(
    serviceId,
    environmentId,
    productTierId,
    subscriptionData?.id
  );

  const dashboardLayoutProps = {
    accessPage: true,
    currentSubscription: subscriptionData,
    isNotShow: true,
    enableConsumptionLinks: true,
    apiDocsurl: serviceAPIDocsLink,
    servicePlanUrlLink: servicePlanUrlLink,
    serviceId: serviceId,
    environmentId: environmentId,
    serviceApiId: serviceOffering?.serviceAPIID,
    SidebarUI: (
      <MarketplaceServiceSidebar
        serviceId={serviceId}
        environmentId={environmentId}
        resourceParameters={serviceOffering?.resourceParameters}
        isLoading={isServiceOfferingLoading}
        serviceName={serviceOffering?.serviceName}
        productTierId={productTierId}
        active={sidebarActiveOptions.subscriptions}
        currentSubscription={subscriptionData}
        isCustomNetworkEnabled={isCustomNetworkEnabled}
      />
    ),

    serviceName: serviceOffering?.serviceName,
    customLogo: true,
    serviceLogoURL: serviceOffering?.serviceLogoURL,
  };

  const unsubsscribeFormik = useFormik({
    initialValues: {
      confirmationText: "",
    },
    onSubmit: (values) => {
      if (values.confirmationText !== "unsubscribe") {
        return snackbar.showError("Please enter unsubscribe");
      }
      /*eslint-disable-next-line no-use-before-define*/
      unsubscribeMutation.mutate(selectedSubscription.id);
    },
  });

  const unsubscribeMutation = useMutation(deleteSubscription, {
    onSuccess: () => {
      refetchSubscriptions();
      setShowUnsubscribeDialog(false);
      unsubsscribeFormik.resetForm();
      snackbar.showSuccess("Unsubscribed Successfully");
    },
  });

  return (
    <>
      <DashboardLayout {...dashboardLayoutProps}>
        <Stack sx={{ minHeight: "calc(100vh - 180px)" }}>
          <Box
            display="flex"
            //@ts-ignore
            flexDirection="colunm"
            justifyContent="flex-start"
            paddingBottom={"32px"}
          >
            <Box paddingTop={"5px"}>
              <DashboardHeaderIcon />
            </Box>
            <LogoHeader
              margin={0}
              title="My Subscriptions"
              desc="Explore your current service subscriptions here"
            />
          </Box>
          <DataGrid
            components={{
              Header: DataGridHeader,
            }}
            componentsProps={{
              header: {
                numSubscriptions: filteredSubscriptions?.length,
                searchText,
                setSearchText,
                typeFilter,
                setTypeFilter,
                viewResourceInstance,
                isFetching,
                handleRefresh: refetchSubscriptions,
                selectedSubscription: selectedSubscription,
                handleUnsubscribeClick: handleUnsubscribeClick,
                isUnsubscribing: unsubscribeMutation.isLoading,
              },
            }}
            onSelectionModelChange={(newSelection) => {
              selectSingleItem(newSelection, selectionModel, setSelectionModel);
            }}
            loading={isFetching}
            checkboxSelection
            disableColumnMenu
            selectionModel={selectionModel}
            disableSelectionOnClick
            columns={columns}
            rows={isFetching ? [] : filteredSubscriptions}
            rowsPerPageOptions={[10]}
            pageSize={10}
            getRowId={(row) => row.id}
            sx={{
              flex: 1,
              boxShadow: "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
              border: "1px solid  rgba(228, 231, 236, 1)",
            }}
            hideFooterSelectedRowCount
          />
        </Stack>

        <TextConfirmationDialog
          open={showUnsubscribeDialog}
          handleClose={() => {
            setShowUnsubscribeDialog(false);
            unsubsscribeFormik.resetForm();
          }}
          formData={unsubsscribeFormik}
          title={`Unsubscribe Service`}
          buttonLabel={"Unsubscribe"}
          buttonColour={"red"}
          isLoading={unsubscribeMutation.isLoading}
          subtitle={`Are you sure you want to unsubscribe from ${selectedSubscription?.serviceName}?`}
          message={
            "To confirm, please enter <b>unsubscribe</b>, in the field below:"
          }
        />
      </DashboardLayout>
    </>
  );
};

export default MySubscriptions;
