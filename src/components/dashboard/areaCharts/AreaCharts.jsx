// src/components/dashboard/areaCharts/AreaCharts.jsx
import AreaBarChart from "./AreaBarChart";
import AreaProgressChart from "./AreaProgressChart";

const AreaCharts = ({ monthlyRevenue, topRooms }) => {
  return (
    <section className="content-area-charts">
      <AreaBarChart monthlyRevenue={monthlyRevenue} />
      <AreaProgressChart topRooms={topRooms} />
    </section>
  );
};

export default AreaCharts;
