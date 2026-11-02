import { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import axios from "axios";
import clsx from "clsx";
import dayjs from "dayjs";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Button from "src/components/Button/Button";
import DataTable from "src/components/DataTable/DataTable";
import LoadingSpinner from "src/components/LoadingSpinner/LoadingSpinner";
import { Text } from "src/components/Typography/Typography";
import type { FlexpriceUsageGroup, FlexpriceUsageWindowSize } from "src/server/api/flexprice";
import Card from "components/Card/Card";

import { FlexpriceUsageParams, useFlexpriceUsage } from "../hooks/useFlexprice";

type UsageRangePreset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth";

const usageRangePresets: { value: UsageRangePreset; label: string }[] = [
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
const NO_INSTANCE_LABEL = "(none)";

function getUsageParams(preset: UsageRangePreset): FlexpriceUsageParams {
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

  return { startTime: start.toISOString(), endTime: end.toISOString(), windowSize };
}

function formatCost(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() || "USD" }).format(
      value
    );
  } catch {
    return value.toFixed(2);
  }
}

const getInstanceLabel = (group: FlexpriceUsageGroup) => group.instanceId || NO_INSTANCE_LABEL;

type ChartSeries = { key: string; label: string; color: string; groups: FlexpriceUsageGroup[] };

function getChartSeries(groups: FlexpriceUsageGroup[]): ChartSeries[] {
  const sortedGroups = [...groups].sort((groupA, groupB) => groupB.totalCost - groupA.totalCost);
  const hasOther = sortedGroups.length > MAX_CHART_SERIES;
  const topGroups = sortedGroups.slice(0, hasOther ? MAX_CHART_SERIES - 1 : MAX_CHART_SERIES);

  const series: ChartSeries[] = topGroups.map((group, index) => ({
    // Instance ids are used as labels only, since recharts treats dots in data keys as paths
    key: `series${index}`,
    label: getInstanceLabel(group),
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
  instanceLabel: string;
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

const FlexpriceUsageBreakdown = () => {
  const [preset, setPreset] = useState<UsageRangePreset>("7d");
  // Computed when the preset changes, so the query key stays stable between renders
  const [params, setParams] = useState(() => getUsageParams("7d"));

  const { data: usage, isPending, isFetching, error, refetch } = useFlexpriceUsage(params);
  const currency = usage?.currency || "USD";

  const series = useMemo(() => getChartSeries(usage?.groups || []), [usage]);
  const chartData = useMemo(() => getChartData(series), [series]);

  const rows: UsageRow[] = useMemo(
    () =>
      [...(usage?.groups || [])]
        .sort((groupA, groupB) => groupB.totalCost - groupA.totalCost)
        .map((group) => ({
          instanceLabel: getInstanceLabel(group),
          unitPrice:
            group.unitPrice === null
              ? "-"
              : `${formatCost(group.unitPrice, currency)}${group.unit ? ` / ${group.unit}` : ""}`,
          totalCost: group.totalCost,
        })),
    [usage, currency]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("instanceLabel", {
        id: "instanceLabel",
        header: "Instance ID",
        meta: { minWidth: 240 },
        cell: (data) => (
          <Text size="small" weight="medium" color="#181D27" ellipsis>
            {data.row.original.instanceLabel}
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
    [currency]
  );

  const handlePresetChange = (value: UsageRangePreset) => {
    setPreset(value);
    setParams(getUsageParams(value));
  };

  const xAxisFormat = params.windowSize === "HOUR" ? "HH:mm" : "MMM D";
  // The range end is exclusive (e.g. midnight on the 1st for Last Month), so label the last day it covers
  const rangeStart = dayjs(params.startTime).format("MMM D");
  const rangeEnd = dayjs(params.endTime).subtract(1, "millisecond").format("MMM D");
  const rangeLabel = rangeStart === rangeEnd ? rangeStart : `${rangeStart} – ${rangeEnd}`;

  return (
    <Stack gap="20px" pt="12px" pb="8px">
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
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <DataTable
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
