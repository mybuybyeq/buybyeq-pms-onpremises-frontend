import { useContext } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ThemeContext } from "../../../context/ThemeContext";
import { FaArrowUpLong, FaArrowDownLong } from "react-icons/fa6";
import { LIGHT_THEME } from "../../../constants/themeConstants";
import "./AreaCharts.scss";
import { BASE_CURRENCY } from "../../../constants/currency";

const AreaBarChart = ({ monthlyRevenue, currentRevenue, revenueComparison }) => {
  const { theme } = useContext(ThemeContext);

  // Transform the data for the chart
  const chartData = monthlyRevenue.map((item) => ({
    month: item.month,
    revenue: Math.round(item.revenue / 1000), // Convert to thousands
  }));

  const isIncrease = revenueComparison >= 0;
  const currentMonthRevenue = currentRevenue || 0;

  // Format helpers
  const formatTooltipValue = (value, name) => {
    if (name === "revenue") return [`${BASE_CURRENCY}${value}k`, "Revenue"];
    return [value, name];
  };

  const formatYAxisLabel = (value) => `${value}k`;
  const formatLegendValue = (value) => value.charAt(0).toUpperCase() + value.slice(1);

  return (
    <div className="bar-chart">
      <div className="bar-chart-info">
        <h5 className="bar-chart-title">Monthly Revenue Comparison</h5>
        <div className="chart-info-data">
          <div className="info-data-value">
            {BASE_CURRENCY}
            {Math.round(currentMonthRevenue / 1000)}k
          </div>
          <div className={`info-data-text ${isIncrease ? "increase" : "decrease"}`}>
            {isIncrease ? <FaArrowUpLong /> : <FaArrowDownLong />}
            <p>
              {Math.abs(revenueComparison).toFixed(1)}% {isIncrease ? "increase" : "decrease"} from last month
            </p>
          </div>
        </div>
      </div>
      <div className="bar-chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <XAxis
              padding={{ left: 10 }}
              dataKey="month"
              tickSize={0}
              axisLine={false}
              tick={{
                fill: theme === LIGHT_THEME ? "#676767" : "#f3f3f3",
                fontSize: 14,
              }}
            />
            <YAxis
              padding={{ bottom: 10, top: 10 }}
              tickFormatter={formatYAxisLabel}
              tickCount={6}
              axisLine={false}
              tickSize={0}
              tick={{
                fill: theme === LIGHT_THEME ? "#676767" : "#f3f3f3",
              }}
            />
            <Tooltip formatter={formatTooltipValue} cursor={{ fill: "transparent" }} />
            <Legend iconType="circle" iconSize={10} verticalAlign="top" align="right" formatter={formatLegendValue} />
            <Bar
              dataKey="revenue"
              fill="#475be8"
              activeBar={false}
              isAnimationActive={false}
              barSize={24}
              radius={[4, 4, 4, 4]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AreaBarChart;
