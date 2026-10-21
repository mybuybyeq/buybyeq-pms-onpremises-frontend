import notFoundImage from "../../assets/images/empty.png";
import { motion } from "framer-motion";

const EmptyState = ({
  image = notFoundImage,
  title = "Empty",
  subtitle = "Data Not Found",
  description = "The data you're looking for doesn't exist or may have deleted.",
  actionButton,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.img
          src={image}
          alt="Empty state"
          style={{
            width: "160px",
            height: "160px",
            margin: "0 auto 24px",
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        />

        <div style={{ marginBottom: "24px" }}>
          <motion.h1
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "8px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.h1>
          <motion.h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "#111827",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {subtitle}
          </motion.h2>
        </div>

        <motion.p
          style={{
            color: "#4B5563",
            marginBottom: "32px",
            lineHeight: "1.5",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>

        {actionButton && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            {actionButton}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default EmptyState;
