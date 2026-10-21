import React, { useState } from "react";
import "./signuppage.css";
import logoImage from "../../assets/images/BBQ_LOGO.png";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

let loginUrl = "loginweb/read";

function PMSLoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        loginUrl,
        {
          email: formData.email,
          password: formData.password,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        },
      );

      if (response.status === 200 && response.data.login === true) {
        const userData = response.data.userData;

        // Set appType for PMS users
        userData.appType = "pms";

        sessionStorage.setItem("ispmsuser", "true");
        sessionStorage.setItem("userData", JSON.stringify(userData));

        if (onLoginSuccess) {
          onLoginSuccess();
        }

        // Navigate to dashboard (now at root)
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setSnackbar({
          open: true,
          message: "Invalid credentials or no access",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "An error occurred during login";

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (error.response.status === 403) {
          errorMessage = "Access denied";
        } else if (error.response.status === 500) {
          errorMessage = "Server error, please try again later";
        }
      } else if (error.request) {
        errorMessage = "Network error, please check your connection";
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const linkStyle = {
    color: "var(--side-text-color)",
    fontSize: "20px",
    textDecoration: "none",
  };

  return (
    <div>
      <div className="signup-container">
        <div className="signup-form">
          <div className="header">
            <div className="headerlogin">
              <div>
                <div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img src={logoImage} alt="#" width="60" height="60" />
                    <h4 style={{ ...linkStyle, marginLeft: "17px" }}>BuyByeQ</h4>
                    <div
                      style={{
                        width: "2.3px",
                        height: "24px",
                        backgroundColor: "orange",
                        borderRadius: "8px",
                        margin: "2px 4px 8px 5px",
                      }}
                    ></div>
                    <h5 style={{ ...linkStyle, fontFamily: "cursive" }}>PMS</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                autoComplete="off"
                required
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                id="password"
                name="password"
                required
                placeholder="Enter Your password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#FFA500",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "4px",
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
                transition: "background-color 0.3s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#FF8C00")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#FFA500")}
            >
              Login To BuyByeQ PMS
            </button>
          </form>
        </div>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default PMSLoginPage;
