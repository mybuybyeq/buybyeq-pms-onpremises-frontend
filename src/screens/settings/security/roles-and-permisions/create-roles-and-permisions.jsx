import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { allPermissions } from "./permissions";
import "./RolesAndPermissions.scss";

const RoleForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    reception: true,
    housekeeping: true,
    reservations: true,
    accounting: true,
    administration: true,
  });

  const isEditMode = location.pathname.includes("/security/add-roles-and-rights");
  const roleData = location.state?.role;

  useEffect(() => {
    if (isEditMode && roleData) {
      setRoleName(roleData.name);
      const initialPermissions = {};
      roleData.permissions.forEach((perm) => {
        initialPermissions[perm] = true;
      });
      setSelectedPermissions(initialPermissions);
    }
  }, [isEditMode, roleData]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePermissionChange = (permission) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleSave = () => {
    if (!roleName.trim()) {
      alert("Please enter a role name");
      return;
    }

    const selected = Object.keys(selectedPermissions).filter((perm) => selectedPermissions[perm]);

    if (selected.length === 0) {
      alert("Please select at least one permission");
      return;
    }

    const rolePayload = {
      name: roleName,
      permissions: selected,
      createdAt: isEditMode ? roleData.createdAt : new Date().toISOString().split("T")[0],
    };

    // In a real app, you would handle API call here
    console.log(isEditMode ? "Updating role:" : "Creating role:", rolePayload);

    // Navigate back to roles table with the new data
    navigate("/security/roles-and-rights", {
      state: {
        role: rolePayload,
        isEdit: isEditMode,
      },
    });
  };

  return (
    <div className="roles-permissions-page">
      <h1 className="page-title" style={{ color: "var(--side-text-color)" }}>
        {isEditMode ? "Edit Role" : "Create New Role"}
      </h1>

      <div className="role-form">
        <div className="form-group">
          <label htmlFor="roleName">
            <h3 style={{ color: "var(--side-text-color)" }}>Role Name</h3>
          </label>
          <input
            type="text"
            id="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Enter role name (e.g. Reception Manager)"
            required
          />
        </div>

        <div className="permissions-container">
          <h3 style={{ color: "var(--side-text-color)", marginBottom: "15px" }}>Select Permissions</h3>

          {Object.entries(allPermissions).map(([section, items]) => (
            <div key={section} className="permission-section">
              <div className="section-header" onClick={() => toggleSection(section)}>
                <h3>{section.charAt(0).toUpperCase() + section.slice(1)}</h3>
                <span className="toggle-icon">{expandedSections[section] ? "−" : "+"}</span>
              </div>

              {expandedSections[section] && (
                <ul className="permission-list">
                  {items.map((item) => (
                    <li key={item} className="permission-item">
                      <input
                        type="checkbox"
                        id={item}
                        name={item}
                        checked={!!selectedPermissions[item]}
                        onChange={() => handlePermissionChange(item)}
                      />
                      <label htmlFor={item}>
                        {item
                          .split("-")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate("/security/roles-and-rights")}>
            Cancel
          </button>
          <button type="button" className="submit-btn" onClick={handleSave}>
            {isEditMode ? "Update Role" : "Save Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleForm;
