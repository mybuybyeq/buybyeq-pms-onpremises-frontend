import notFoundImage from "../../assets/images/notfound.png";
import { useEffect } from "react";
import { motion } from "framer-motion";

const PageNotFound = () => {
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
          src={notFoundImage}
          alt="Page not found"
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
            404
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
            Page Not Found
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
          The page you're looking for doesn't exist or may have been moved.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default PageNotFound;
