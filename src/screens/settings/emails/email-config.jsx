import React, { useState, useEffect } from "react";
import { Snackbar, Alert, CircularProgress } from "@mui/material";
import { FiSave, FiSend, FiLock, FiAlertTriangle, FiCheckCircle, FiInfo } from "react-icons/fi";
import "./email-config.scss";
import axios from "../../../api/axios";

const EmailConfigPage = () => {
  const [smtpConfig, setSmtpConfig] = useState({
    mailer: "SMTP",
    host: "",
    port: 587,
    email: "",
    password: "",
    encryption: "tls",
    send_from: "",
    property_id: null,
    email_test_success: false,
    last_tested_at: null,
  });

  const [testEmail, setTestEmail] = useState("");
  const [isPasswordDirty, setIsPasswordDirty] = useState(false);
  const [validationError, setValidationError] = useState({ password: "" });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configStatus, setConfigStatus] = useState({
    configured: false,
    tested: false,
    last_tested_at: null,
  });

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchConfig(selectedProperty);
      fetchConfigStatus(selectedProperty);
    }
  }, [selectedProperty]);

  const fetchConfig = async (propertyId) => {
    try {
      const response = await axios.get(`email/get-config?property_id=${propertyId}`);
      if (response.data.config) {
        setSmtpConfig({
          ...response.data.config,
          password: "********",
          property_id: propertyId,
        });
        setIsPasswordDirty(false);
      } else {
        setSmtpConfig({
          mailer: "SMTP",
          host: "",
          port: 587,
          email: "",
          password: "",
          encryption: "tls",
          send_from: "",
          property_id: propertyId,
          email_test_success: false,
          last_tested_at: null,
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      showSnackbar("Failed to fetch email configuration", "error");
    }
  };

  const fetchConfigStatus = async (propertyId) => {
    try {
      const response = await axios.get(`email/get-config-status?property_id=${propertyId}`);
      console.log("Config Status Response:", response.data);

      setConfigStatus({
        configured: response.data.status?.configured || false,
        tested: response.data.status?.tested || false,
        last_tested_at: response.data.status?.last_tested_at || null,
      });
    } catch (error) {
      console.error("Error fetching config status:", error);
    }
  };

  const fetchPropertiesData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const propertiesRes = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);
      const filteredProperties = Array.isArray(propertiesRes.data)
        ? propertiesRes.data.filter((business) => business.business_type === "H")
        : [];

      setProperties(
        filteredProperties.map((property) => ({
          id: property.business_entity_id,
          name: property.business_name,
        })),
      );

      if (filteredProperties.length > 0) {
        setSelectedProperty(filteredProperties[0].business_entity_id);
      }
    } catch (error) {
      console.error("Error:", error);
      showSnackbar("Failed to load properties", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    if (name === "password") {
      setIsPasswordDirty(true);
    }
    setSmtpConfig({ ...smtpConfig, [name]: value });

    if (name === "password") {
      setValidationError((prev) => ({ ...prev, password: "" }));
    }
  };

  const validateFields = () => {
    let valid = true;
    const errors = { password: "" };

    const { host, port, email, password, send_from, property_id } = smtpConfig;

    if (!host || !port || !email || !send_from || !property_id) {
      valid = false;
    }

    if (password === "********" || (isPasswordDirty && !password)) {
      errors.password = "Password is required when updating configuration";
      valid = false;
    }

    setValidationError(errors);
    return valid;
  };

  const saveConfig = async () => {
    if (!validateFields()) {
      showSnackbar("All required fields must be filled", "warning");
      return;
    }

    const payload = {
      ...smtpConfig,
      password: isPasswordDirty ? smtpConfig.password : undefined,
    };

    try {
      const response = await axios.post("email/save-config", payload);
      if (response.data.success) {
        showSnackbar(
          response.data.message || "Configuration saved successfully! Please test the configuration.",
          "success",
        );
        fetchConfig(selectedProperty);
        fetchConfigStatus(selectedProperty);
      }
    } catch (error) {
      console.error("Error saving config:", error);
      showSnackbar(error.response?.data?.error || "Failed to save configuration", "error");
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      showSnackbar("Please enter a test email address", "warning");
      return;
    }

    try {
      const response = await axios.post("email/send-test-email", {
        to: testEmail,
        property_id: selectedProperty,
      });

      if (response.data.success) {
        showSnackbar(response.data.message || "Test email sent successfully!", "success");
        setConfigStatus({
          configured: true,
          tested: true,
          last_tested_at: new Date().toISOString(),
        });
        fetchConfigStatus(selectedProperty);
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      showSnackbar(error.response?.data?.error || "Failed to send test email", "error");
      fetchConfigStatus(selectedProperty);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const TestStatusIndicator = () => {
    if (loading) {
      return (
        <div className="test-status-loading">
          <CircularProgress size={20} />
          <span>Loading configuration status...</span>
        </div>
      );
    }

    if (!configStatus.configured) {
      return (
        <div className="test-status-warning">
          <FiAlertTriangle className="warning-icon" />
          <span>No email configuration found for this property.</span>
        </div>
      );
    }

    if (!configStatus.tested) {
      return (
        <div className="test-status-warning">
          <FiAlertTriangle className="warning-icon" />
          <span>This configuration has not been tested yet.</span>
        </div>
      );
    }

    return (
      <div className="test-status-success">
        <FiCheckCircle className="success-icon" />
        <span>Last test successful on {new Date(configStatus.last_tested_at).toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div className="content-area-table">
      <div className="email-config-page">
        <h4 className="data-table-title">Email Configuration Settings</h4>

        <div className="config-card">
          <div className="setting-card-content">
            <h5 className="data-table-title">Email Configuration</h5>

            <div className="form-group property-selector">
              <label>Property*</label>
              <select
                value={selectedProperty || ""}
                onChange={(e) => setSelectedProperty(e.target.value)}
                disabled={loading || properties.length === 0}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <TestStatusIndicator />

            <div className="form-grid">
              <div className="form-group">
                <label>Mailer</label>
                <input type="text" name="mailer" value={smtpConfig.mailer} onChange={handleConfigChange} disabled />
              </div>
              <div className="form-group">
                <label>Host*</label>
                <input type="text" name="host" value={smtpConfig.host} onChange={handleConfigChange} required />
              </div>
              <div className="form-group">
                <label>Port*</label>
                <input type="number" name="port" value={smtpConfig.port} onChange={handleConfigChange} required />
              </div>
              <div className="form-group">
                <label>Email*</label>
                <input type="email" name="email" value={smtpConfig.email} onChange={handleConfigChange} required />
              </div>
              <div className="form-group">
                <label>Password*</label>
                <div className="password-input">
                  <FiLock className="input-icon" />
                  <input
                    type="password"
                    name="password"
                    value={smtpConfig.password}
                    onChange={handleConfigChange}
                    required
                    autoComplete="new-password"
                    placeholder={isPasswordDirty ? "" : "********"}
                  />
                </div>
                {validationError.password && <div className="error-message">{validationError.password}</div>}
              </div>
              <div className="form-group">
                <label>Encryption</label>
                <select name="encryption" value={smtpConfig.encryption} onChange={handleConfigChange}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                </select>
              </div>
              <div className="form-group">
                <label>Send From*</label>
                <input
                  type="email"
                  name="send_from"
                  value={smtpConfig.send_from}
                  onChange={handleConfigChange}
                  required
                />
              </div>
            </div>
            <button className="save-button" onClick={saveConfig} disabled={!selectedProperty || loading}>
              <FiSave className="button-icon" />
              {loading ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>

        <div className="config-card">
          <div className="setting-card-content">
            <h4 className="data-table-title">Email Configuration Verification</h4>
            <p className="test-description">
              An email will be sent to verify if your settings are correct.
              <br />
              <strong>Important:</strong> You must test your configuration after saving changes.
              <br />
              {configStatus.configured && !configStatus.tested && (
                <strong className="warning-text">
                  <FiAlertTriangle /> This configuration is not active until tested successfully.
                </strong>
              )}
            </p>
            <div className="test-email-container">
              <div className="form-group">
                <label>Test Email Address*</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to receive test"
                />
              </div>
              <button
                className="test-button"
                onClick={sendTestEmail}
                disabled={!selectedProperty || !testEmail || loading}
              >
                <FiSend className="button-icon" />
                {loading ? "Sending..." : "Send Test Email"}
              </button>
            </div>
          </div>
        </div>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert severity={snackbar.severity} onClose={handleCloseSnackbar} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
};

export default EmailConfigPage;
