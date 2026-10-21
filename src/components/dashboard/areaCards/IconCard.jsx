import PropTypes from "prop-types";
import { FiClock, FiUser, FiCalendar, FiLogOut, FiHome, FiCheckCircle, FiBook, FiBookmark } from "react-icons/fi";

const IconCard = ({ icon, colors, cardInfo }) => {
  const iconMap = {
    delayed: <FiClock size={24} />,
    pending: <FiUser size={24} />,
    upcoming: <FiCalendar size={24} />,
    checkout: <FiLogOut size={24} />,
    booked: <FiHome size={24} />,
    available: <FiCheckCircle size={24} />,
    active: <FiBookmark size={24} />,
    total: <FiBook size={24} />,
  };

  return (
    <div className="stats-card">
      <div className="card-content">
        <div className="card-icon" style={{ backgroundColor: colors[0] }}>
          {iconMap[icon] || <FiCalendar size={24} />}
        </div>
        <div className="card-text">
          <h3>{cardInfo.value}</h3>
          <p>{cardInfo.title}</p>
        </div>
      </div>
    </div>
  );
};

IconCard.propTypes = {
  icon: PropTypes.oneOf(["delayed", "pending", "upcoming", "checkout", "booked", "available", "active", "total"])
    .isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  cardInfo: PropTypes.shape({
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
};

export default IconCard;
