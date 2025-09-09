// src/pages/AddUser.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Search, Plus, X, Trash, Pencil } from "lucide-react";

// ✅ Modal Component
function AddOrEditUser({
  formData,
  setFormData,
  onSave,
  onCancel,
  departments,
  autoGenerate,
  handleAutoGenerate,
}) {
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(e);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 relative">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <X size={20} />
        </button>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {formData.userId ? "Edit User" : "Add New User"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            name="userMail"
            placeholder="Email"
            value={formData.userMail}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required={!formData.userId} // not required on edit
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          >
            <option value="">Select Role</option>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
            <option value="Department Admin">Department Admin</option>
          </select>

          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.departmentAckr}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="text"
              name="userNumber"
              placeholder="User Number"
              value={formData.userNumber}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              disabled={autoGenerate}
              required
            />
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => handleAutoGenerate(e.target.checked)}
              />
              Auto Generate
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              {formData.userId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ Main Page
export default function AddUser({ adminName }) {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    userId: null,
    userMail: "",
    userNumber: "",
    role: "",
    departmentId: "",
    password: "",
  });
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/api/departments")
      .then((res) => setDepartments(res.data))
      .catch(console.error);

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const handleAutoGenerate = async (checked) => {
    setAutoGenerate(checked);
    if (checked && formData.departmentId) {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/users/lastEmpNumber/${formData.departmentId}`
        );
        const lastEmp = res.data?.userNumber || null;
        const department = departments.find(
          (d) => d.departmentId === parseInt(formData.departmentId)
        );
        let newEmpNum = lastEmp
          ? `${department.departmentAckr.toLowerCase()}${parseInt(
              lastEmp.replace(/\D/g, "")
            ) + 1}`
          : `${department.departmentAckr.toLowerCase()}1`;
        setFormData((prev) => ({ ...prev, userNumber: newEmpNum }));
      } catch (err) {
        console.error("Error generating userNumber:", err);
      }
    } else {
      setFormData((prev) => ({ ...prev, userNumber: "" }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.userId) {
        await axios.put(`http://localhost:5000/api/users/${formData.userId}`, {
          ...formData,
          updatedBy: adminName,
        });
        alert("User updated!");
      } else {
        await axios.post("http://localhost:5000/api/users", {
          ...formData,
          createdBy: adminName,
        });
        alert("User added!");
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        data: { updatedBy: adminName },
      });
      alert("User deleted!");
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: null,
      userMail: "",
      userNumber: "",
      role: "",
      departmentId: "",
      password: "",
    });
    setAutoGenerate(false);
    setShowForm(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.userMail?.toLowerCase().includes(search.toLowerCase()) ||
      u.userNumber?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen bg-gray-50 p-6 relative">
      {showForm && (
        <AddOrEditUser
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={resetForm}
          departments={departments}
          autoGenerate={autoGenerate}
          handleAutoGenerate={handleAutoGenerate}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="relative w-full sm:w-80 mb-4 sm:mb-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-blue-600 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">User Number</th>
                <th className="py-3 px-4 text-left">Role</th>
                <th className="py-3 px-4 text-left">Department</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{u.userMail}</td>
                    <td className="py-3 px-4">{u.userNumber}</td>
                    <td className="py-3 px-4">{u.role}</td>
                    <td className="py-3 px-4">
                      {u.department?.departmentAckr || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-center flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setFormData(u);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.userId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
