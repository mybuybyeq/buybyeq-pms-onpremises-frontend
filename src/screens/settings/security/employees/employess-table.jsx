import { useState } from "react";
import "./employees.scss";

const TABLE_HEADS = ["Employee", "Email", "Role", "Date of Birth", "Joined Date", "Status", "Action"];

const initialEmployeeData = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    role: "Mobile Developer",
    dob: "1990-05-15",
    createdAt: "2023-01-10",
    status: "Active",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    role: "Hostech Admin",
    dob: "1985-08-22",
    createdAt: "2023-02-15",
    status: "Active",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
  },
];

const EmployeeTable = () => {
  const [employeeData, setEmployeeData] = useState(initialEmployeeData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Mobile",
    dob: "",
    status: "Active",
    image: null,
  });

  const handleView = (employee) => {
    console.log("Viewing employee:", employee);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      dob: employee.dob,
      status: employee.status,
      image: employee.image,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (employee) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`);
    if (confirmDelete) {
      setEmployeeData(employeeData.filter((item) => item.id !== employee.id));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee({
      ...newEmployee,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    setNewEmployee({
      ...newEmployee,
      image: e.target.files[0],
    });
  };

  const handleStatusChange = (employeeId) => {
    setEmployeeData(
      employeeData.map((emp) =>
        emp.id === employeeId ? { ...emp, status: emp.status === "Active" ? "Inactive" : "Active" } : emp,
      ),
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingEmployee) {
      // Update existing employee
      setEmployeeData(
        employeeData.map((item) => (item.id === editingEmployee.id ? { ...item, ...newEmployee } : item)),
      );
    } else {
      // Add new employee
      const newId = Math.max(...employeeData.map((item) => item.id)) + 1;
      setEmployeeData([
        ...employeeData,
        {
          id: newId,
          ...newEmployee,
          createdAt: new Date().toISOString().split("T")[0],
          image: newEmployee.image || "https://randomuser.me/api/portraits/lego/1.jpg",
        },
      ]);
    }

    // Reset form and close modal
    setIsModalOpen(false);
    setEditingEmployee(null);
    setNewEmployee({
      firstName: "",
      lastName: "",
      email: "",
      role: "Mobile",
      dob: "",
      status: "Active",
      image: null,
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setNewEmployee({
      firstName: "",
      lastName: "",
      email: "",
      role: "Mobile",
      dob: "",
      status: "Active",
      image: null,
    });
  };

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Employees Management</h4>
        <button className="add-btn" onClick={() => setIsModalOpen(true)}>
          + Add Employee
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
            {employeeData.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="employee-info">
                    <img
                      src={employee.image}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      className="employee-avatar"
                    />
                    <span>
                      {employee.firstName} {employee.lastName}
                    </span>
                  </div>
                </td>
                <td>{employee.email}</td>
                <td>{employee.role}</td>
                <td>{new Date(employee.dob).toLocaleDateString()}</td>
                <td>{new Date(employee.createdAt).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`status-badge ${employee.status.toLowerCase()}`}
                    onClick={() => handleStatusChange(employee.id)}
                  >
                    {employee.status}
                  </span>
                </td>
                <td className="dt-cell-action">
                  <div className="action-buttons">
                    <button onClick={() => handleEdit(employee)} className="edit-btn" title="Edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(employee)} className="delete-btn" title="Delete">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal compact-modal">
            <div className="modal-header sticky-header">
              <h3>{editingEmployee ? "Edit Employee" : "Add New Employee"}</h3>
              <button className="close-btn" onClick={handleModalClose}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {/* Row 1 */}
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={newEmployee.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={newEmployee.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" value={newEmployee.email} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input type="date" name="dob" value={newEmployee.dob} onChange={handleInputChange} required />
                  </div>

                  {/* Row 3 */}
                  <div className="form-group">
                    <label>Role *</label>
                    <select name="role" value={newEmployee.role} onChange={handleInputChange} required>
                      <option value="Mobile">Mobile</option>
                      <option value="Hostech Admin">Hostech Admin</option>
                      <option value="Contact">Contact</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status *</label>
                    <select name="status" value={newEmployee.status} onChange={handleInputChange} required>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Full-width Row */}
                  <div className="form-group full-width">
                    <label>Employee Image (308px × 338px)</label>
                    <div className="image-upload-container">
                      <input
                        type="file"
                        name="image"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="file-input"
                      />
                      <div className="image-preview">
                        {newEmployee.image ? (
                          typeof newEmployee.image === "string" ? (
                            <img src={newEmployee.image} alt="Preview" className="preview-image" />
                          ) : (
                            <div className="file-info">
                              <span>{newEmployee.image.name}</span>
                            </div>
                          )
                        ) : (
                          <div className="upload-prompt">
                            <span>Click to upload image</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-actions sticky-footer">
                  <button type="button" className="cancel-btn" onClick={handleModalClose}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingEmployee ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EmployeeTable;
