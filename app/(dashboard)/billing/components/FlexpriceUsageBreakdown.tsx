import { SetStateAction, useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import axios from "axios";
import clsx from "clsx";
import dayjs from "dayjs";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Button from "src/components/Button/Button";
import DataTable from "src/components/DataTable/DataTable";
import {
  DateRange,
  DateTimePickerPopover,
  initialRangeState,
} from "src/components/DateRangePicker/DateTimeRangePickerStatic";
import { getLocalStartOfDayfromISODateString } from "src/components/DateRangePicker/utils";
import MenuItem from "src/components/FormElementsv2/MenuItem/MenuItem";
import Select from "src/components/FormElementsv2/Select/Select";
import LoadingSpinner from "src/components/LoadingSpinner/LoadingSpinner";
import { Text } from "src/components/Typography/Typography";
import { FLEXPRICE_USAGE_GROUP_BY_OPTIONS, FlexpriceUsageGroupByKey } from "src/constants/flexpriceUsage";
import useSnackbar from "src/hooks/useSnackbar";
import type { FlexpriceUsageGroup, FlexpriceUsageWindowSize } from "src/server/api/flexprice";
import Card from "components/Card/Card";

import { FlexpriceUsageParams, useFlexpriceUsage } from "../hooks/useFlexprice";

type UsageRangePreset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom";

const usageRangePresets: { value: Exclude<UsageRangePreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

// The chart gets one line per instance for the most expensive ones, the rest are combined
const MAX_CHART_SERIES = 8;
const seriesColors = ["#7F56D9", "#2E90FA", "#12B76A", "#F79009", "#F04438", "#0BA5EC", "#EE46BC", "#6172F3"];
const otherSeriesColor = "#98A2B3";
const NO_VALUE_LABEL = "(none)";

function getUsageParams(preset: UsageRangePreset, groupBy: FlexpriceUsageGroupByKey): FlexpriceUsageParams {
  const now = dayjs();
  const startOfToday = now.startOf("day");
  let start = startOfToday;
  let end = now;
  let windowSize: FlexpriceUsageWindowSize = "DAY";

  if (preset === "today") {
    windowSize = "HOUR";
  } else if (preset === "7d") {
    start = startOfToday.subtract(6, "day");
  } else if (preset === "30d") {
    start = startOfToday.subtract(29, "day");
  } else if (preset === "thisMonth") {
    start = now.startOf("month");
  } else {
    start = now.subtract(1, "month").startOf("month");
    end = now.startOf("month");
  }

  return { startTime: start.toISOString(), endTime: end.toISOString(), windowSize, groupBy };
}

/**
 * Converts a range picked in the date picker into usage params.
 * The picker returns calendar dates (as UTC), which are used as whole local days,
 * from the start of the first day to the end of the last one, but no later than now.
 * Returns null when the range has no past time in it (e.g. it's all in the future).
 */
function getCustomUsageParams(range: DateRange, groupBy: FlexpriceUsageGroupByKey): FlexpriceUsageParams | null {
  if (!range.startDate || !range.endDate) return null;

  const now = dayjs();
  const start = dayjs(getLocalStartOfDayfromISODateString(range.startDate));
  const lastDay = dayjs(getLocalStartOfDayfromISODateString(range.endDate));
  const endOfLastDay = lastDay.add(1, "day");
  const end = endOfLastDay.isAfter(now) ? now : endOfLastDay;
  if (!start.isBefore(end)) return null;

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    // A single day is shown hourly, like Today
    windowSize: lastDay.isSame(start, "day") ? "HOUR" : "DAY",
    groupBy,
  };
}

// Unit prices can be fractions of a cent, so they keep up to 6 decimals instead of rounding to the currency's 2
function formatCost(value: number, currency: string, { isUnitPrice = false } = {}) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase() || "USD",
      ...(isUnitPrice && { maximumFractionDigits: 6 }),
    }).format(value);
  } catch {
    return isUnitPrice ? String(value) : value.toFixed(2);
  }
}

const getGroupLabel = (group: FlexpriceUsageGroup) => group.value || NO_VALUE_LABEL;

const getGroupByLabel = (groupBy: FlexpriceUsageGroupByKey) =>
  FLEXPRICE_USAGE_GROUP_BY_OPTIONS.find(({ key }) => key === groupBy)?.label ?? groupBy;

type ChartSeries = { key: string; label: string; color: string; groups: FlexpriceUsageGroup[] };

function getChartSeries(groups: FlexpriceUsageGroup[]): ChartSeries[] {
  const sortedGroups = [...groups].sort((groupA, groupB) => groupB.totalCost - groupA.totalCost);
  const hasOther = sortedGroups.length > MAX_CHART_SERIES;
  const topGroups = sortedGroups.slice(0, MAX_CHART_SERIES);

  const series: ChartSeries[] = topGroups.map((group, index) => ({
    // Group values are used as labels only, since recharts treats dots in data keys as paths
    key: `series${index}`,
    label: getGroupLabel(group),
    color: seriesColors[index],
    groups: [group],
  }));
  if (hasOther) {
    series.push({
      key: "other",
      label: "Other",
      color: otherSeriesColor,
      groups: sortedGroups.slice(topGroups.length),
    });
  }

  return series;
}

function getChartData(series: ChartSeries[]) {
  const rowsByTimestamp = new Map<string, Record<string, number | string>>();

  series.forEach(({ key, groups }) => {
    groups.forEach((group) => {
      group.points.forEach(({ timestamp, cost }) => {
        if (!rowsByTimestamp.has(timestamp)) {
          rowsByTimestamp.set(timestamp, { timestamp, ...Object.fromEntries(series.map((item) => [item.key, 0])) });
        }
        const row = rowsByTimestamp.get(timestamp)!;
        row[key] = (row[key] as number) + cost;
      });
    });
  });

  return Array.from(rowsByTimestamp.values()).sort((rowA, rowB) =>
    Date.parse(rowA.timestamp as string) < Date.parse(rowB.timestamp as string) ? -1 : 1
  );
}

type UsageRow = {
  groupLabel: string;
  unitPrice: string;
  totalCost: number;
};

const columnHelper = createColumnHelper<UsageRow>();

const BreakdownTableHeader = () => (
  <div className="py-5 px-6 border-b border-[#E4E7EC]">
    <Text size="large" weight="semibold" color="#101828">
      Usage Breakdown
    </Text>
  </div>
);

type FlexpriceUsageBreakdownProps = {
  // Stays mounted while hidden to keep the selected range; usage only loads once it's shown
  isOpen: boolean;
};

const FlexpriceUsageBreakdown = ({ isOpen }: FlexpriceUsageBreakdownProps) => {
  const [preset, setPreset] = useState<UsageRangePreset>("7d");
  // Computed when the preset changes, so the query key stays stable between renders
  const [groupBy, setGroupBy] = useState<FlexpriceUsageGroupByKey>("instance_id");
  const [params, setParams] = useState(() => getUsageParams("7d", "instance_id"));
  const [customRange, setCustomRange] = useState<DateRange>(initialRangeState);
  const snackbar = useSnackbar();

  // The breakdown stays mounted while hidden, so refresh the selected range up to now whenever it's opened.
  // This adjusts state during render (not in an effect), so no request goes out with the old range first.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      const refreshedParams =
        preset === "custom" ? getCustomUsageParams(customRange, groupBy) : getUsageParams(preset, groupBy);
      if (refreshedParams) setParams(refreshedParams);
    }
  }

  const { data: usage, isPending, isFetching, error, refetch } = useFlexpriceUsage(params, isOpen);
  const currency = usage?.currency || "USD";

  // While a new range loads the previous one stays on screen, so describe the range and grouping actually shown
  const shownParams = usage?.params ?? params;

  const series = useMemo(() => getChartSeries(usage?.groups || []), [usage]);
  const chartData = useMemo(() => getChartData(series), [series]);

  const rows: UsageRow[] = useMemo(
    () =>
      [...(usage?.groups || [])]
        .sort((groupA, groupB) => groupB.totalCost - groupA.totalCost)
        .map((group) => ({
          groupLabel: getGroupLabel(group),
          unitPrice:
            group.unitPrice === null
              ? "-"
              : `${formatCost(group.unitPrice, currency, { isUnitPrice: true })}${group.unit ? ` / ${group.unit}` : ""}`,
          totalCost: group.totalCost,
        })),
    [usage, currency]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("groupLabel", {
        id: "groupLabel",
        header: getGroupByLabel(shownParams.groupBy),
        meta: { minWidth: 240 },
        cell: (data) => (
          <Text size="small" weight="medium" color="#181D27" ellipsis>
            {data.row.original.groupLabel}
          </Text>
        ),
      }),
      columnHelper.accessor("unitPrice", {
        id: "unitPrice",
        header: "Unit Price",
        meta: { minWidth: 160, align: "right" },
        cell: (data) => (
          <Text size="small" weight="regular" color="#475467">
            {data.row.original.unitPrice}
          </Text>
        ),
      }),
      columnHelper.accessor("totalCost", {
        id: "totalCost",
        header: "Total Cost",
        meta: { minWidth: 160, align: "right" },
        cell: (data) => (
          <Text size="small" weight="regular" color="#475467">
            {formatCost(data.row.original.totalCost, currency)}
          </Text>
        ),
      }),
    ],
    [currency, shownParams.groupBy]
  );

  const handlePresetChange = (value: UsageRangePreset) => {
    setPreset(value);
    setParams(getUsageParams(value, groupBy));
  };

  // Cancelling the picker passes back an empty range, which keeps the current selection
  const handleCustomRangeChange = (action: SetStateAction<DateRange>) => {
    if (typeof action === "function" || !action.startDate || !action.endDate) return;

    const customParams = getCustomUsageParams(action, groupBy);
    if (!customParams) {
      snackbar.showError("Choose a date range that includes today or earlier");
      return;
    }

    setCustomRange(action);
    setPreset("custom");
    setParams(customParams);
  };

  const handleGroupByChange = (value: FlexpriceUsageGroupByKey) => {
    setGroupBy(value);
    // Keep the selected range as it is, only regroup it
    setParams((currentParams) => ({ ...currentParams, groupBy: value }));
  };

  const xAxisFormat = shownParams.windowSize === "HOUR" ? "HH:mm" : "MMM D";
  // The range end is exclusive (e.g. midnight on the 1st for Last Month), so label the last day it covers
  // Custom ranges can reach into other years, so show the year when it isn't the current one
  const rangeStartDate = dayjs(shownParams.startTime);
  const rangeEndDate = dayjs(shownParams.endTime).subtract(1, "millisecond");
  const rangeFormat =
    rangeStartDate.isSame(dayjs(), "year") && rangeEndDate.isSame(dayjs(), "year") ? "MMM D" : "MMM D, YYYY";
  const rangeStart = rangeStartDate.format(rangeFormat);
  const rangeEnd = rangeEndDate.format(rangeFormat);
  const rangeLabel = rangeStart === rangeEnd ? rangeStart : `${rangeStart} – ${rangeEnd}`;

  return (
    <Stack gap="20px" pt="12px" pb="8px">
      <Stack direction="row" alignItems="center" gap="12px" flexWrap="wrap">
        <div className="inline-flex self-start rounded-lg border border-[#D5D7DA] bg-white p-1">
          {usageRangePresets.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handlePresetChange(value)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                preset === value ? "bg-[#F5F5F5] text-[#181D27]" : "text-[#535862] hover:text-[#181D27]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <DateTimePickerPopover
          dateRange={preset === "custom" ? customRange : initialRangeState}
          setDateRange={handleCustomRangeChange}
          initialDateRange={preset === "custom" ? customRange : undefined}
          selectionType="date"
          hideClearButton
        />
        <Select
          id="flexprice-usage-group-by"
          name="flexprice-usage-group-by"
          value={groupBy}
          onChange={(event) => handleGroupByChange(event.target.value as FlexpriceUsageGroupByKey)}
          renderValue={(value) => `Group by: ${getGroupByLabel(value as FlexpriceUsageGroupByKey)}`}
          fullWidth={false}
          sx={{
            minWidth: "auto",
            height: "40px !important",
            marginTop: 0,
            "& .MuiSelect-select": { fontSize: "14px", color: "#414651", fontWeight: "500" },
          }}
        >
          {FLEXPRICE_USAGE_GROUP_BY_OPTIONS.map(({ key, label }) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {isPending ? (
        <LoadingSpinner />
      ) : error ? (
        <Stack gap="16px" alignItems="center" justifyContent="center" py="48px">
          <Text size="medium" weight="medium" color="#535862">
            {(axios.isAxiosError(error) && error.response?.data?.message) || "Failed to load usage. Please retry"}
          </Text>
          <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>
            Retry
          </Button>
        </Stack>
      ) : (
        <Stack gap="20px" sx={{ opacity: isFetching ? 0.6 : 1, transition: "opacity 0.2s" }}>
          <Card sx={{ alignSelf: "flex-start", minWidth: 280, boxShadow: "0px 1px 2px 0px #0A0D120D" }}>
            <Text size="small" weight="medium" color="#535862">
              Total spend
            </Text>
            <Text size="large" weight="semibold" color="#181D27" sx={{ fontSize: "28px", mt: "8px" }}>
              {formatCost(usage?.totalCost || 0, currency)}
            </Text>
          </Card>

          <Card sx={{ boxShadow: "0px 1px 2px 0px #0A0D120D" }}>
            <Text size="medium" weight="semibold" color="#181D27">
              Usage Trend
            </Text>
            <Text size="xsmall" weight="regular" color="#535862" sx={{ mt: "2px", mb: "16px" }}>
              {rangeLabel}
            </Text>
            {chartData.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" height="200px">
                <Text size="medium" weight="medium" color="#535862">
                  No usage in this period
                </Text>
              </Stack>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => dayjs(value).format(xAxisFormat)}
                    tick={{ fontSize: 12, fill: "#7E8299" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCost(value, currency)}
                    tick={{ fontSize: 12, fill: "#7E8299" }}
                    width={80}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      dayjs(value).format(`MMM D, YYYY${xAxisFormat === "HH:mm" ? " HH:mm" : ""}`)
                    }
                    formatter={(value: number) => formatCost(value, currency)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {series.map(({ key, label, color }) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={label}
                      stroke={color}
                      strokeWidth={2}
                      // A single time bucket has no line to draw, so mark it with a dot instead
                      dot={chartData.length === 1}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <DataTable
            // DataTable keeps its page when rows change, so start on the first page for each new result
            key={`${shownParams.startTime}-${shownParams.endTime}-${shownParams.groupBy}-${rows.length}`}
            columns={columns}
            rows={rows}
            HeaderComponent={BreakdownTableHeader}
            noRowsText="No usage in this period"
            hidePagination={rows.length < 11}
            minHeight="auto"
          />
        </Stack>
      )}
    </Stack>
  );
};

export default FlexpriceUsageBreakdown;
