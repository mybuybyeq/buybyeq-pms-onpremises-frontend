import { useState, useEffect } from "react";
import axios from "../../../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import EmptyState from "../../../error/EmptyState";
import Alert from "@mui/material/Alert";
import { BASE_CURRENCY } from "../../../../constants/currency";

const MEAL_PLAN_TYPES = ["None", "BB (Breakfast)", "HB (Half Board)", "FB (Full Board)", "AI (All Inclusive)"];

const MealPlansTable = () => {
  const [mealPlans, setMealPlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    room_type_id: "",
    meal_plan_type: "None",
    base_price: "",
    adult_price: "",
    child_price: "",
    infant_price: "",
  });
  const [selectedProperty, setSelectedProperty] = useState("");
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const propertiesRes = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);
        const filteredData = propertiesRes.data.filter((business) => business.business_type === "H");

        setProperties(filteredData);
        if (filteredData.length) {
          setSelectedProperty(filteredData[0].business_entity_id);
        }

        const roomTypesRes = await axios.get(`pms/roomTypes/getAllRoomTypes/${userData.Group_ID}`);
        setRoomTypes(roomTypesRes.data);

        const mealPlansRes = await axios.get(`pms/mealPlans/getAll/${userData.Group_ID}/${null}`);
        setMealPlans(mealPlansRes.data);
      } catch (error) {
        showSnackbar("Error loading data", "error");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchFilteredMealPlans = async () => {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      try {
        const url = selectedProperty
          ? `pms/mealPlans/getAll/${null}/${selectedProperty}`
          : `pms/mealPlans/getAll/${userData.Group_ID}/${null}`;

        const res = await axios.get(url);
        setMealPlans(res.data);
      } catch (error) {
        showSnackbar("Error filtering meal plans", "error");
        console.error("Error:", error);
      }
    };

    if (!loading) {
      fetchFilteredMealPlans();
    }
  }, [selectedProperty]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setNewPlan({
      name: plan.name,
      room_type_id: plan.room_type_id,
      meal_plan_type: plan.meal_plan_type,
      base_price: plan.base_price,
      adult_price: plan.adult_price || "",
      child_price: plan.child_price || "",
      infant_price: plan.infant_price || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (plan) => {
    if (window.confirm(`Delete ${plan.name} meal plan?`)) {
      try {
        await axios.delete(`pms/mealPlans/delete/${plan.id}`);
        setMealPlans(mealPlans.filter((p) => p.id !== plan.id));
        showSnackbar("Meal plan deleted successfully", "success");
      } catch (error) {
        showSnackbar("Error deleting meal plan", "error");
        console.error("Error:", error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlan({
      ...newPlan,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    const userData = JSON.parse(sessionStorage.getItem("userData"));
    e.preventDefault();

    try {
      const planData = {
        ...newPlan,
        base_price: parseFloat(newPlan.base_price),
        adult_price: newPlan.adult_price ? parseFloat(newPlan.adult_price) : null,
        child_price: newPlan.child_price ? parseFloat(newPlan.child_price) : null,
        infant_price: newPlan.infant_price ? parseFloat(newPlan.infant_price) : null,
      };

      if (editingPlan) {
        await axios.put(`pms/mealPlans/update/${editingPlan.id}`, planData);
        showSnackbar("Meal plan updated successfully", "success");
      } else {
        await axios.post("pms/mealPlans/add", planData);
        showSnackbar("Meal plan added successfully", "success");
      }

      const res = await axios.get(
        selectedProperty
          ? `pms/mealPlans/getAll/${null}/${selectedProperty}`
          : `pms/mealPlans/getAll/${userData.Group_ID}/${null}`,
      );
      setMealPlans(res.data);

      handleModalClose();
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Operation failed";
      showSnackbar(errorMsg, "error");
      console.error("Error:", error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setNewPlan({
      name: "",
      room_type_id: "",
      meal_plan_type: "None",
      base_price: "",
      adult_price: "",
      child_price: "",
      infant_price: "",
    });
  };

  const getPropertyName = (id) => {
    return properties.find((p) => p.business_entity_id === id)?.business_name || "Unknown";
  };

  if (loading) {
    return <div className="loading">Loading meal plans...</div>;
  }

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Meal Plans & Rate Management</h4>
      </div>
      <select
        style={{
          width: "20%",
          padding: "8px",
          marginRight: "10px",
          color: "var(--base-text-color)",
          backgroundColor: "var(--background-color)",
          border: "1px solid var(--base-text-color)",
          borderRadius: "4px",
          boxSizing: "border-box",
        }}
        value={selectedProperty}
        onChange={(e) => setSelectedProperty(e.target.value)}
        className="property-filter"
      >
        <option value="">All Properties</option>
        {properties.map((property) => (
          <option key={property.business_entity_id} value={property.business_entity_id}>
            {property.business_name}
          </option>
        ))}
      </select>
      {mealPlans.length > 0 && (
        <button className="add-btn" onClick={() => setIsModalOpen(true)}>
          + Add Meal/Rate Plan
        </button>
      )}
      {mealPlans.length > 0 ? (
        <div className="data-table-diagram">
          <table>
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Room Type</th>
                <th>Property</th>
                <th>Meal Plan</th>
                <th>Base Price</th>
                <th>Adult/Child/Infant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mealPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.room_type}</td>
                  <td>{plan.property_name}</td>
                  <td>{plan.meal_plan_type}</td>
                  <td>
                    {BASE_CURRENCY}
                    {plan.base_price}
                  </td>
                  <td>
                    {BASE_CURRENCY}
                    {plan.adult_price || plan.base_price} /{BASE_CURRENCY}
                    {plan.child_price || plan.base_price / 2} /{BASE_CURRENCY}
                    {plan.infant_price || 0}
                  </td>
                  <td className="actions">
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button onClick={() => handleEdit(plan)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(plan)} className="delete-btn">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title=""
          subtitle="No meal plans were found."
          description="There are currently no meal plans available. You can add a new meal plan to get started."
          actionButton={
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + Add Meal/Rate Plan
            </button>
          }
        />
      )}

      {/* Rate Plan Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="compact-modal">
              <div className="modal-header">
                <h3>{editingPlan ? "Edit Meal/Rate Plan" : "Create Meal/Rate Plan"}</h3>
                <button className="close-btn" onClick={handleModalClose}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Plan Name*</label>
                      <input type="text" name="name" value={newPlan.name} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label>Room Type*</label>
                      <select name="room_type_id" value={newPlan.room_type_id} onChange={handleInputChange} required>
                        <option value="">Select Room Type</option>
                        {roomTypes
                          .filter((rt) => !selectedProperty || rt.property_id == selectedProperty)
                          .map((rt) => (
                            <option key={rt.id} value={rt.id}>
                              {rt.room_type} ({getPropertyName(rt.property_id)})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Meal Plan*</label>
                      <select
                        name="meal_plan_type"
                        value={newPlan.meal_plan_type}
                        onChange={handleInputChange}
                        required
                      >
                        {MEAL_PLAN_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Base Price ({BASE_CURRENCY})*</label>
                      <input
                        type="number"
                        name="base_price"
                        value={newPlan.base_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Adult Price ({BASE_CURRENCY})</label>
                      <input
                        type="number"
                        name="adult_price"
                        value={newPlan.adult_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Child Price ({BASE_CURRENCY})</label>
                      <input
                        type="number"
                        name="child_price"
                        value={newPlan.child_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Infant Price ({BASE_CURRENCY})</label>
                      <input
                        type="number"
                        name="infant_price"
                        value={newPlan.infant_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="form-note">Note: Adult/Child prices will override base price if specified</div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={handleModalClose}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingPlan ? "Update" : "Create"} Rate Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </section>
  );
};

export default MealPlansTable;
