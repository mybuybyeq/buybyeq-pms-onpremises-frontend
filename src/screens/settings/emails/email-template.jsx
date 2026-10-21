import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { Snackbar, Alert } from "@mui/material";
import { FiSave, FiMail, FiInfo, FiSend } from "react-icons/fi";
import axios from "../../../api/axios";
import "./email-config.scss";
import { TINYMCE_API_KEY } from "../../../constants/api-keys";

const EmailTemplatesPage = () => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const { propertyId: initialPropertyId } = useParams();

  const [state, setState] = useState({
    templates: [],
    currentTemplate: null,
    placeholders: [],
    activeTab: "BOOKING_CONFIRMATION",
    loading: true,
    saving: false,
    snackbar: { open: false, message: "", severity: "success" },
    testDialog: { open: false, reservationId: "", email: "" },
    sendingTest: false,
    propertiesLoading: true,
  });

  const templateTypes = [
    { value: "BOOKING_CONFIRMATION", label: "Booking Confirmation" },
    { value: "CHECK_IN", label: "Check-In" },
    { value: "CHECK_OUT", label: "Check-Out" },
    { value: "BOOKING_CANCELLATION", label: "Cancellation" },
    { value: "PAYMENT_RECEIPT", label: "Payment Receipt" },
  ];

  const defaultTemplates = {
    subjects: {
      CHECK_IN: "Welcome to {hotel_name} - Your Check-In Details",
      CHECK_OUT: "Thank You for Staying at {hotel_name}",
      BOOKING_CONFIRMATION: "Your Booking at {hotel_name} is Confirmed",
      BOOKING_CANCELLATION: "Your Booking at {hotel_name} Has Been Cancelled",
      PAYMENT_RECEIPT: "Payment Receipt for Your Stay at {hotel_name}",
    },
    contents: {
      CHECK_IN: `<p>Dear {guest_name},</p>
                <p>Welcome to {hotel_name}! We're delighted to have you as our guest.</p>
                <p>Your reservation details:</p>
                <ul>
                    <li>Reservation #: {reservation_number}</li>
                    <li>Check-in: {check_in_date}</li>
                    <li>Check-out: {check_out_date}</li>
                </ul>
                <p>We hope you enjoy your stay!</p>
                <p>Sincerely,<br/>{hotel_name} Team</p>`,
      CHECK_OUT: `<p>Dear {guest_name},</p>
                <p>Thank you for staying at {hotel_name}!</p>
                <p>We hope you enjoyed your stay and look forward to welcoming you back soon.</p>
                <p>Sincerely,<br/>{hotel_name} Team</p>`,
      BOOKING_CONFIRMATION: `<p>Dear {guest_name},</p>
                <p>Your booking at {hotel_name} has been confirmed!</p>
                <p>Reservation details:</p>
                <ul>
                    <li>Reservation #: {reservation_number}</li>
                    <li>Check-in: {check_in_date}</li>
                    <li>Check-out: {check_out_date}</li>
                </ul>
                <p>Sincerely,<br/>{hotel_name} Team</p>`,
      BOOKING_CANCELLATION: `<p>Dear {guest_name},</p>
                <p>Your booking at {hotel_name} has been cancelled as requested.</p>
                <p>We hope to welcome you in the future.</p>
                <p>Sincerely,<br/>{hotel_name} Team</p>`,
      PAYMENT_RECEIPT: `<p>Dear {guest_name},</p>
                <p>Thank you for your payment to {hotel_name}.</p>
                <p>Payment details:</p>
                <ul>
                    <li>Amount: {payment_amount}</li>
                    <li>Date: {payment_date}</li>
                    <li>Reservation #: {reservation_number}</li>
                </ul>
                <p>Sincerely,<br/>{hotel_name} Team</p>`,
    },
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  const fetchPropertiesData = async () => {
    try {
      setState((prev) => ({ ...prev, propertiesLoading: true }));
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const propertiesRes = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);
      const filteredProperties = Array.isArray(propertiesRes.data)
        ? propertiesRes.data.filter((business) => business.business_type === "H")
        : [];

      const propertiesList = filteredProperties.map((property) => ({
        id: property.business_entity_id,
        name: property.business_name,
      }));

      setProperties(propertiesList);

      // Set the selected property
      let propertyToSelect = null;

      // If there's an initial property ID in URL and it exists in properties, use that
      if (initialPropertyId && propertiesList.some((p) => p.id.toString() === initialPropertyId)) {
        propertyToSelect = initialPropertyId;
      }
      // Otherwise use the first property if available
      else if (propertiesList.length > 0) {
        propertyToSelect = propertiesList[0].id;
      }

      if (propertyToSelect) {
        setSelectedProperty(propertyToSelect);
      }
    } catch (error) {
      console.error("Error:", error);
      showSnackbar("Failed to load properties", "error");
    } finally {
      setState((prev) => ({ ...prev, propertiesLoading: false }));
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      initializeTemplates();
    }
  }, [selectedProperty, state.activeTab]);

  const initializeTemplates = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const [placeholdersRes, templatesRes] = await Promise.all([
        axios.get("email-templates/get-placeholders"),
        axios.get(`email-templates/get-templates?property_id=${selectedProperty}`),
      ]);

      setState((prev) => ({
        ...prev,
        placeholders: placeholdersRes.data.placeholders || [],
        templates: templatesRes.data.templates || [],
      }));

      await loadTemplate(state.activeTab);
    } catch (error) {
      showSnackbar("Failed to initialize templates", "error");
      console.error("Initialization error:", error);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadTemplate = async (templateType) => {
    if (!selectedProperty) return;

    try {
      const res = await axios.get(
        `email-templates/get-template?property_id=${selectedProperty}&template_type=${templateType}`,
      );

      const template = res.data.template || {
        property_id: parseInt(selectedProperty),
        template_type: templateType,
        subject: defaultTemplates.subjects[templateType] || "Important Information About Your Stay",
        content:
          defaultTemplates.contents[templateType] ||
          `<p>Dear {guest_name},</p>
                    <p>Thank you for your interaction with {hotel_name}.</p>
                    <p>Sincerely,<br/>{hotel_name} Team</p>`,
        is_active: false,
      };

      setState((prev) => ({
        ...prev,
        currentTemplate: template,
        activeTab: templateType,
      }));
    } catch (error) {
      showSnackbar("Failed to load template", "error");
      console.error("Template load error:", error);
    }
  };

  const handlePropertyChange = (e) => {
    const newPropertyId = e.target.value;
    setSelectedProperty(newPropertyId);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setState((prev) => ({
      ...prev,
      currentTemplate: {
        ...prev.currentTemplate,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const handleContentChange = (content) => {
    setState((prev) => ({
      ...prev,
      currentTemplate: {
        ...prev.currentTemplate,
        content,
      },
    }));
  };

  const saveTemplate = async () => {
    if (!state.currentTemplate?.subject || !state.currentTemplate?.content) {
      showSnackbar("Subject and content are required", "warning");
      return;
    }

    try {
      setState((prev) => ({ ...prev, saving: true }));

      const templateToSave = {
        ...state.currentTemplate,
        property_id: parseInt(selectedProperty),
      };

      await axios.post("email-templates/save-template", templateToSave);
      showSnackbar("Template saved successfully", "success");

      const res = await axios.get(`email-templates/get-templates?property_id=${selectedProperty}`);
      setState((prev) => ({ ...prev, templates: res.data.templates || [] }));
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to save template";
      showSnackbar(errorMessage, "error");
      console.error("Save error:", error);
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const sendTestEmail = async () => {
    if (!state.testDialog.reservationId) {
      showSnackbar("Reservation ID is required", "warning");
      return;
    }

    if (!state.currentTemplate?.id) {
      showSnackbar("Please save the template before sending a test", "warning");
      return;
    }

    try {
      setState((prev) => ({ ...prev, sendingTest: true }));
      await axios.post("email-templates/render-template", {
        template_id: state.currentTemplate.id,
        reservation_id: state.testDialog.reservationId,
        test_email: state.testDialog.email,
      });

      showSnackbar("Test email sent successfully", "success");
      setState((prev) => ({
        ...prev,
        testDialog: { ...prev.testDialog, open: false },
        sendingTest: false,
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to send test email";
      showSnackbar(errorMessage, "error");
      console.error("Test email error:", error);
      setState((prev) => ({ ...prev, sendingTest: false }));
    }
  };

  const showSnackbar = (message, severity) => {
    setState((prev) => ({
      ...prev,
      snackbar: { open: true, message, severity },
    }));
  };

  const closeSnackbar = () => {
    setState((prev) => ({
      ...prev,
      snackbar: { ...prev.snackbar, open: false },
    }));
  };

  const getPlaceholders = () => {
    if (!state.activeTab || !state.placeholders.length) return [];

    return state.placeholders.filter(
      (ph) => ph.applicable_templates && ph.applicable_templates.split(",").includes(state.activeTab),
    );
  };

  const insertPlaceholder = (placeholder) => {
    const editor = window.tinymce.get("template-editor");
    if (editor) {
      editor.insertContent(`{${placeholder}}`);
    } else {
      showSnackbar("Editor not ready yet", "warning");
    }
  };

  return (
    <section className="content-area-table">
      <div className="email-templates-page">
        <h4 className="data-table-title">Email Templates</h4>
        <div className="form-group property-selector" style={{ width: "300px", marginBottom: "20px" }}>
          <label>Select Property*</label>
          <select
            value={selectedProperty || ""}
            onChange={handlePropertyChange}
            disabled={state.propertiesLoading || properties.length === 0}
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
            {properties.length === 0 && <option value="">No properties available</option>}
          </select>
          {state.propertiesLoading && <span className="loading-text">Loading properties...</span>}
        </div>

        {selectedProperty ? (
          <div className="template-container">
            <div className="tabs">
              {templateTypes.map((type) => (
                <button
                  key={type.value}
                  className={`tab ${state.activeTab === type.value ? "active" : ""}`}
                  onClick={() => loadTemplate(type.value)}
                >
                  <FiMail /> {type.label}
                </button>
              ))}
            </div>

            {state.loading ? (
              <div className="loading">Loading template...</div>
            ) : (
              <div className="editor-container">
                <div className="header">
                  <div className="subject">
                    <label>Subject:</label>
                    <input
                      type="text"
                      name="subject"
                      value={state.currentTemplate?.subject || ""}
                      onChange={handleChange}
                      placeholder="Email subject"
                    />
                  </div>
                  <div className="actions">
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={state.currentTemplate?.is_active || false}
                        onChange={handleChange}
                      />
                      <span className="slider"></span>
                      Active
                    </label>
                    <button
                      className="test-btn"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          testDialog: { ...prev.testDialog, open: true },
                        }))
                      }
                      disabled={!state.currentTemplate?.id}
                    >
                      <FiSend /> Test
                    </button>
                  </div>
                </div>

                <div className="editor-area">
                  <div className="placeholders">
                    <h4>Placeholders</h4>
                    <div className="placeholder-list">
                      {getPlaceholders().map((ph) => (
                        <button
                          key={ph.placeholder_key}
                          onClick={() => insertPlaceholder(ph.placeholder_key)}
                          title={ph.description}
                        >
                          {ph.placeholder_key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="editor">
                    <Editor
                      apiKey={TINYMCE_API_KEY}
                      id="template-editor"
                      value={state.currentTemplate?.content || ""}
                      onEditorChange={handleContentChange}
                      init={{
                        height: 500,
                        menubar: false,
                        plugins: [
                          "advlist autolink lists link image charmap print preview anchor",
                          "searchreplace visualblocks code fullscreen",
                          "insertdatetime media table paste code help wordcount",
                        ],
                        toolbar:
                          "undo redo | formatselect | " +
                          "bold italic backcolor | alignleft aligncenter " +
                          "alignright alignjustify | bullist numlist outdent indent | " +
                          "removeformat | help",
                        content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                      }}
                    />
                  </div>
                </div>

                <div className="footer-actions">
                  <button className="save-btn" onClick={saveTemplate} disabled={state.saving}>
                    <FiSave /> {state.saving ? "Saving..." : "Save Template"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          !state.propertiesLoading &&
          properties.length === 0 && (
            <div className="no-properties">
              <p>No properties available to configure email templates.</p>
            </div>
          )
        )}

        {/* Test Email Dialog */}
        {state.testDialog.open && (
          <div className="dialog-overlay">
            <div className="dialog">
              <h3>Send Test Email</h3>
              <div className="form-group">
                <label>Reservation ID:</label>
                <input
                  type="text"
                  value={state.testDialog.reservationId}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      testDialog: { ...prev.testDialog, reservationId: e.target.value },
                    }))
                  }
                  placeholder="Enter reservation ID"
                />
              </div>
              <div className="form-group">
                <label>Email (optional):</label>
                <input
                  type="email"
                  value={state.testDialog.email}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      testDialog: { ...prev.testDialog, email: e.target.value },
                    }))
                  }
                  placeholder="Defaults to reservation email"
                />
              </div>
              <div className="dialog-actions">
                <button
                  className="cancel"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      testDialog: { ...prev.testDialog, open: false },
                    }))
                  }
                >
                  Cancel
                </button>
                <button
                  className="confirm"
                  onClick={sendTestEmail}
                  disabled={state.sendingTest || !state.testDialog.reservationId}
                >
                  {state.sendingTest ? "Sending..." : "Send Test"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Snackbar
          open={state.snackbar.open}
          autoHideDuration={6000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={state.snackbar.severity} onClose={closeSnackbar} sx={{ width: "100%" }}>
            {state.snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </section>
  );
};

export default EmailTemplatesPage;
