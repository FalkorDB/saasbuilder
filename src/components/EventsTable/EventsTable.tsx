import { Box, IconButton, Stack } from "@mui/material";
import EventMessageChip from "./EventMessageChip";
import { createColumnHelper } from "@tanstack/react-table";
import { AccessEvent, EventType } from "src/types/event";
import { FC, useMemo, useState } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EventTypeChip from "./EventTypeChip";
import formatDateUTC from "src/utils/formatDateUTC";
import useUserData from "src/hooks/usersData";
import { getAccessControlRoute } from "src/utils/route/access/accessRoute";
import GridCellExpand from "../GridCellExpand/GridCellExpand";
import DateRangePicker, {
  initialRangeState,
} from "../DateRangePicker/DateRangePicker";
import { Range } from "react-date-range";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import DataTable from "src/components/DataTable/DataTable";
import JSONView from "src/components/JSONView/JSONView";
import { OnCopyProps } from "react-json-view";
import { SetState } from "src/types/common/reactGenerics";
import DataGridHeaderTitle from "src/components/Headers/DataGridHeaderTitle";
import SearchInput from "src/components/DataGrid/SearchInput";
import RefreshWithToolTip from "src/components/RefreshWithTooltip/RefreshWithToolTip";
import AuditLogsEventFilterDropdown from "../ResourceInstance/AuditLogs/components/AuditLogsEventFilterDropdown";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
const columnHelper = createColumnHelper<AccessEvent>();

type EventsTableHeaderProps = {
  count: number;
  searchText: string;
  setSearchText: SetState<string>;
  refetchEvents: () => void;
  isRefetching: boolean;
  selectedDateRange: Range;
  setSelectedDateRange: SetState<Range>;
  selectedEventTypes: EventType[];
  setSelectedEventTypes: SetState<EventType[]>;
};

const EventsTableHeader: FC<EventsTableHeaderProps> = (props) => {
  const {
    count,
    searchText,
    setSearchText,
    refetchEvents,
    isRefetching,
    selectedDateRange,
    setSelectedDateRange,
    selectedEventTypes,
    setSelectedEventTypes,
  } = props;

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      p="20px 24px 14px"
      borderBottom="1px solid #EAECF0"
    >
      <DataGridHeaderTitle title="List of Events" count={count} />
      <Stack direction="row" alignItems="center" gap="12px">
        <SearchInput
          searchText={searchText}
          setSearchText={setSearchText}
          placeholder="Search by Message/User"
          width="250px"
        />
        <RefreshWithToolTip refetch={refetchEvents} disabled={isRefetching} />
        <DateRangePicker
          dateRange={selectedDateRange}
          setDateRange={setSelectedDateRange}
        />
        <AuditLogsEventFilterDropdown
          selectedEventTypes={selectedEventTypes}
          setSelectedEventTypes={setSelectedEventTypes}
        />
      </Stack>
    </Stack>
  );
};

function DetailTableRowView(props: { rowData: AccessEvent }) {
  const { rowData: event } = props;
  const { workflowFailures } = event;
  return (
    <Box sx={{ margin: "10px 12px" }}>
      <JSONView
        src={workflowFailures}
        theme="isotope"
        enableClipboard={(copy: OnCopyProps) => {
          navigator.clipboard.writeText(JSON.stringify(copy.src));
        }}
        displayDataTypes={false}
        style={{
          flex: 1,
          padding: "16px",
          borderRadius: "12px",
          minHeight: "140px",
          maxHeight: "160px",
          overflowY: "auto",
        }}
      />
    </Box>
  );
}

type EventsTableProps = {
  events: AccessEvent[];
  serviceId: string;
  environmentId: string;
  productTierId: string;
  subscriptionId: string;
  refetchEvents: () => void;
  isRefetching: boolean;
};

const EventsTable: FC<EventsTableProps> = (props) => {
  const {
    serviceId,
    environmentId,
    productTierId,
    subscriptionId,
    events,
    isRefetching,
    refetchEvents,
  } = props;

  const [searchText, setSearchText] = useState("");
  const [selectedDateRange, setSelectedDateRange] =
    useState<Range>(initialRangeState);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);

  const userData = useUserData();
  const currentUserOrgId = userData.userData?.orgId;

  const dataTableColumns = useMemo(() => {
    return [
      columnHelper.display({
        id: "expandAction",
        header: "",
        cell: (data) => {
          const isRowExpandible = data.row.getCanExpand();
          return isRowExpandible ? (
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={data.row.getToggleExpandedHandler()}
              disabled={!isRowExpandible}
            >
              {data.row.getIsExpanded() ? (
                <RemoveCircleOutlineIcon sx={{ fontSize: "20px" }} />
              ) : (
                <AddCircleOutlineIcon sx={{ fontSize: "20px" }} />
              )}
            </IconButton>
          ) : (
            ""
          );
        },
        meta: {
          width: 75,
        },
      }),
      columnHelper.accessor("resourceName", {
        id: "resourceName",
        header: "Resource Name",
        meta: {
          flex: 0.7,
        },
      }),
      columnHelper.accessor("resourceInstanceId", {
        id: "resourceInstanceId",
        header: "Resource Instance ID",
      }),
      columnHelper.accessor("eventSource", {
        id: "type",
        header: "Type",
        cell: (data) => {
          return data.row.original.eventSource ? (
            <EventTypeChip eventType={data.row.original.eventSource} />
          ) : (
            "-"
          );
        },
        meta: {
          flex: 0.8,
        },
      }),
      columnHelper.accessor((row) => formatDateUTC(row.time), {
        id: "time",
        header: "Time",
        cell: (data) =>
          data.row.original.time ? formatDateUTC(data.row.original.time) : "-",
      }),
      columnHelper.accessor("message", {
        id: "message",
        header: "Message",
        cell: (data) => {
          return data.row.original.message ? (
            <EventMessageChip message={data.row.original.message} />
          ) : (
            "-"
          );
        },
      }),
      columnHelper.accessor("userName", {
        id: "userName",
        header: "User",
        cell: (data) => {
          const userId = data.row.original.userId;
          const userName = data.row.original.userName;
          const orgName = data.row.original.orgName;

          const isUserOmnistrateSystem =
            userName === "System" && orgName === "System";

          const isUserServiceProvider =
            data.row.original.orgId &&
            currentUserOrgId !== data.row.original.orgId &&
            !isUserOmnistrateSystem;

          let pageLink = null;
          if (!isUserServiceProvider && !isUserOmnistrateSystem && userId) {
            pageLink = getAccessControlRoute(
              serviceId,
              environmentId,
              productTierId,
              subscriptionId,
              userId
            );
          }

          let userDisplayLabel = userName;

          if (isUserServiceProvider) {
            userDisplayLabel = `Service Provider`;
          }

          return (
            <GridCellExpand
              href={pageLink}
              target="_blank"
              value={userDisplayLabel || "-"}
            />
          );
        },
      }),
    ];
  }, [
    currentUserOrgId,
    serviceId,
    environmentId,
    productTierId,
    subscriptionId,
  ]);

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (searchText) {
      const searchTerm = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (event) =>
          event.userName?.toLowerCase().includes(searchTerm) ||
          event.message.toLowerCase().includes(searchTerm)
      );
    }

    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter((event) => {
        return selectedEventTypes.includes(event.eventSource);
      });
    }

    if (
      selectedDateRange &&
      selectedDateRange.startDate &&
      selectedDateRange.endDate
    ) {
      const startDate = dayjs(selectedDateRange.startDate).format("YYYY-MM-DD");
      const endDate = dayjs(selectedDateRange.endDate).format("YYYY-MM-DD");

      filtered = filtered.filter((event) => {
        const eventDate = dayjs(event.time).format("YYYY-MM-DD");

        return (
          dayjs(eventDate).isSameOrAfter(startDate) &&
          dayjs(eventDate).isSameOrBefore(endDate)
        );
      });
    }

    return filtered;
  }, [events, searchText, selectedEventTypes, selectedDateRange]);

  return (
    <Box mt="24px">
      <DataTable
        columns={dataTableColumns}
        rows={filteredEvents}
        renderDetailsComponent={DetailTableRowView}
        noRowsText="No Events available"
        getRowCanExpand={(rowData) =>
          Boolean(rowData.original.workflowFailures?.length > 0)
        }
        HeaderComponent={EventsTableHeader}
        headerProps={{
          count: filteredEvents.length,
          searchText: searchText,
          setSearchText: setSearchText,
          refetchLogs: refetchEvents,
          selectedDateRange: selectedDateRange,
          setSelectedDateRange: setSelectedDateRange,
          selectedEventTypes: selectedEventTypes,
          setSelectedEventTypes: setSelectedEventTypes,
          isRefetching: isRefetching,
          refetchEvents: refetchEvents,
        }}
        isLoading={isRefetching}
      />
    </Box>
  );
};

export default EventsTable;