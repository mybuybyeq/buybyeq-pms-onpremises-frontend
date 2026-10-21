// src/components/dashboard/areaCharts/AreaProgressChart.jsx
import { BASE_CURRENCY } from "../../../constants/currency";

const AreaProgressChart = ({ topRooms }) => {
  // Transform the API data to match your component format
  const progressData = topRooms.map((room, index) => ({
    id: index + 1,
    name: `${room.room_type} (${room.charge_code})`,
    percentValues:
      room.total_revenue > 1000
        ? (room.total_revenue / 1000).toFixed(2)
        : room.total_revenue, // Convert to thousands if over 1000
    isOverThousand: room.total_revenue > 1000,
    revenue: room.total_revenue,
  }));
  return (
    <div className="progress-bar">
      <div className="progress-bar-info">
        <h4 className="progress-bar-title">Top Performing Rooms Types/Units</h4>
      </div>
      <div className="progress-bar-list">
        {progressData?.map((room) => (
          <div className="progress-bar-item" key={room.id}>
            <div className="bar-item-info">
              <p className="bar-item-info-name">{room.name}</p>
              <p className="bar-item-info-value">
                {BASE_CURRENCY} {room.percentValues}
                {room.isOverThousand ? "K" : ""}
              </p>
            </div>
            <div className="bar-item-full">
              <div
                className="bar-item-filled"
                style={{
                  width: !room.isOverThousand
                    ? `1%`
                    : `${Math.min(100, room.percentValues)}%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AreaProgressChart;
