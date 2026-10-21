import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TABLE_HEADS } from "./permissions";
import "./RolesAndPermissions.scss";
import { useTabContext } from "../../../../context/TabContext";

const RolesTable = () => {
  const navigate = useNavigate();
  const { openTab } = useTabContext();
  const handleNavigation = (title, path, component, prop) => {
    openTab({ title, path, component });
    navigate(path, prop);
  };

  const [roles, setRoles] = useState([
    {
      id: 1,
      name: "Reception Manager",
      permissions: ["check-in", "check-out", "room-assignment", "room-cleaning-status", "maintenance-requests"],
      createdAt: "2023-05-15",
    },
    {
      id: 2,
      name: "Housekeeping Supervisor",
      permissions: ["room-cleaning-status", "maintenance-requests"],
      createdAt: "2023-06-20",
    },
    {
      id: 3,
      name: "Accounting Staff",
      permissions: ["daily-reports", "invoice-generation"],
      createdAt: "2023-07-10",
    },
  ]);

  const handleAddRole = () => {
    handleNavigation("Add Role", "/security/add-roles-and-rights", "AddRolesAndRights", {});
  };

  const handleEdit = (role) => {
    handleNavigation("Edit Role", "/security/add-roles-and-rights", "AddRolesAndRights", { state: { role } });
  };

  const handleDelete = (role) => {
    if (window.confirm(`Are you sure you want to delete ${role.name}?`)) {
      setRoles(roles.filter((r) => r.id !== role.id));
    }
  };

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Roles Management</h4>
        <button className="add-btn" onClick={handleAddRole}>
          + Add Role
        </button>
      </div>

      <div className="data-table-diagram">
        <table>
          <thead>
            <tr>
              {TABLE_HEADS.map((th, index) => (
                <th key={index}>{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>
                  <div className="permissions-list">
                    {role.permissions.length > 0 ? (
                      <>
                        <span className="permission-tag">
                          {role.permissions
                            .slice(0, 3)
                            .map((perm) =>
                              perm
                                .split("-")
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" "),
                            )
                            .join(", ")}
                        </span>
                        {role.permissions.length > 3 && (
                          <span className="more-permissions"> +{role.permissions.length - 3} more</span>
                        )}
                      </>
                    ) : (
                      <span className="no-permissions">No permissions assigned</span>
                    )}
                  </div>
                </td>

                <td>{role.createdAt}</td>
                <td className="dt-cell-action">
                  <div className="action-buttons">
                    <button onClick={() => handleEdit(role)} className="edit-btn">
                      View/Edit
                    </button>
                    <button onClick={() => handleDelete(role)} className="delete-btn">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RolesTable;
