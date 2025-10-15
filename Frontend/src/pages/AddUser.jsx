import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Search, Plus, X, Trash, Pencil, Cpu } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

// 🔹 Modal Component
function AddOrEditUser({
  formData,
  setFormData,
  onSave,
  onCancel,
  departments,
  setDepartments,
  selectedCompanyName,
  selectedCompanyId,
  userRole,
  companies,
  autoGenerate,
  setAutoGenerate, // Added to allow updating autoGenerate state
  handleAutoGenerate,
  isEdit,
}) {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "role") {
      if (value === "Admin" && userRole === "Super Admin") {
        setFormData({ ...formData, role: value, departmentId: 1, biometricNumber: "" });
        setAutoGenerate(false); // Uncheck Auto Generate
      } else if (value === "Super Admin") {
        setFormData({ ...formData, role: value, companyId: 1, departmentId: 1, biometricNumber: "" });
        setAutoGenerate(false); // Uncheck Auto Generate
      } else {
        setFormData({ ...formData, role: value, departmentId: "", biometricNumber: "" });
        setAutoGenerate(false); // Uncheck Auto Generate
      }
    } else if (name === "companyId") {
      setFormData({ ...formData, companyId: value, departmentId: "", biometricNumber: "" });
      setAutoGenerate(false); // Uncheck Auto Generate
    } else if (name === "departmentId") {
      setFormData({ ...formData, departmentId: value });
      setAutoGenerate(false); // Uncheck Auto Generate
    } else if (name === "biometricNumber") {
      // Ensure only integer values or empty string
      const intValue = value === "" ? "" : parseInt(value, 10);
      setFormData({ ...formData, [name]: isNaN(intValue) ? "" : intValue.toString() });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  // Fetch departments dynamically when company changes
  useEffect(() => {
    const fetchDepartments = async () => {
      // Use selectedCompanyId for non-Super Admins if companyId is not set
      const companyIdToFetch = formData.companyId || selectedCompanyId;
      if (!companyIdToFetch) {
        setDepartments([]);
        return;
      }
      try {
        const res = await axios.get(
          `http://localhost:5000/api/departments?companyId=${companyIdToFetch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Fetched departments:", res.data); // Debug log
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Error fetching departments:", err.response?.data || err.message);
        toast.error("Error fetching departments");
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, [formData.companyId, selectedCompanyId, setDepartments]);

  const showCompanyField = () => {
    if (userRole === "Super Admin") {
      if (formData.role === "Super Admin") return false;
      return true;
    }
    return false; // Non-Super Admins don't see company field
  };

  const showDepartmentField = () => {
    return formData.role === "Staff" || formData.role === "Department Admin";
  };

  const showBiometricNumberField = () => {
    return formData.role === "Staff";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X size={16} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-2">
            <Cpu className="text-blue-600" size={24} />
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-800 text-center mb-1">
          {isEdit ? "Edit User" : "Add New User"}
        </h2>

        <form onSubmit={onSave} className="space-y-3">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="userMail"
              placeholder="Email"
              value={formData.userMail}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required={!isEdit}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            >
              <option value="">Select Role</option>
              {(() => {
                let availableRoles = ["Super Admin", "Admin", "Department Admin", "Staff"];
                if (userRole === "Admin") {
                  availableRoles = ["Admin", "Department Admin", "Staff"];
                }
                return availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Company */}
          {showCompanyField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                name="companyId"
                value={formData.companyId || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select Company</option>
                {companies
                  .filter((c) => c.companyId !== 1)
                  .map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Department */}
          {showDepartmentField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                name="departmentId"
                value={formData.departmentId ?? ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.departmentAckr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Biometric Number */}
          {showBiometricNumberField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biometric Number</label>
              <input
                type="text"
                name="biometricNumber"
                placeholder="Biometric Number"
                value={formData.biometricNumber || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                pattern="[0-9]*"
                title="Please enter a valid integer"
              />
            </div>
          )}

          {/* User Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Number</label>
            <div className="flex items-center gap-2 py-1">
              <input
                type="text"
                name="userNumber"
                placeholder="User Number"
                value={formData.userNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                disabled={autoGenerate || isEdit}
                required
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) =>
                    handleAutoGenerate(e.target.checked, formData.departmentId)
                  }
                  disabled={isEdit}
                />
                Auto Generate
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded-md transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition text-sm"
            >
              {isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 🔹 Main Component
export default function AddUser({ selectedCompanyId, selectedCompanyName }) {
  const token = sessionStorage.getItem("token");
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [formData, setFormData] = useState({
    userNumber: "",
    userMail: "",
    role: "",
    departmentId: "",
    companyId: selectedCompanyId || "",
    password: "",
    biometricNumber: "",
  });
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getCompanyAcronym = (id) => {
    const company = companies.find((c) => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  const getDepartmentAcronym = (id) => {
    const dept = allDepartments.find((d) => d.departmentId === id);
    return dept ? dept.departmentAckr : "";
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const companyRes = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(companyRes.data);

        let deptRes;
        if (selectedCompanyId) {
          deptRes = await axios.get(
            `http://localhost:5000/api/departments?companyId=${selectedCompanyId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          deptRes = await axios.get("http://localhost:5000/api/departments", {
            headers: { Authorization: `Bearer ${token}` } }
          );
        }
        console.log("Initial departments:", deptRes.data); // Debug log
        setDepartments(deptRes.data);

        let url = "http://localhost:5000/api/users";
        if (selectedCompanyId) {
          url += `?companyId=${selectedCompanyId}`;
        }
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);

        const allDept = await axios.get("http://localhost:5000/api/departments", {
          headers: { Authorization: `Bearer ${token}` } }
        );
        setAllDepartments(allDept.data);
      } catch (err) {
        console.error("Error fetching data:", err.response?.data || err.message);
        toast.error("Error fetching data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCompanyId, token, refreshFlag]);

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUserRole(decoded.role);
    }
  }, [token]);

  const openAddUserForm = () => {
    setFormData({
      userNumber: "",
      userMail: "",
      role: "",
      departmentId: "",
      companyId: selectedCompanyId || (currentUserRole === "Super Admin" ? "" : 1),
      password: "",
      biometricNumber: "",
    });
    setAutoGenerate(false);
    setIsEdit(false);
    setShowForm(true);
  };

  const handleAutoGenerate = async (checked, departmentId) => {
    setAutoGenerate(checked);
    if (!checked) return setFormData((prev) => ({ ...prev, userNumber: "" }));

    try {
      const companyIdToUse = formData.companyId || selectedCompanyId || 1;
      const departmentIdToUse = departmentId || 1;
      const res = await axios.post(
        `http://localhost:5000/api/users/lastEmpNumber/${departmentIdToUse}`,
        {
          role: formData.role,
          companyId: companyIdToUse,
          departmentId: departmentIdToUse,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData((prev) => ({ ...prev, userNumber: res.data.lastEmpNumber }));
    } catch (err) {
      console.error("Error generating userNumber:", err.response?.data || err.message);
      toast.error("Error generating user number");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      createdBy: userNumber,
      updatedBy: userNumber,
      companyId: formData.companyId || selectedCompanyId || 1,
      departmentId: formData.departmentId || 1,
    };

    try {
      if (isEdit) {
        await axios.put(
          `http://localhost:5000/api/users/${formData.userNumber}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post("http://localhost:5000/api/users", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      Swal.fire({
        icon: "success",
        title: isEdit ? "Updated" : "Added",
        text: `User ${isEdit ? "Updated" : "Added"} Successfully`,
      });
      setShowForm(false);
      setRefreshFlag((prev) => !prev);
    } catch (err) {
      console.error("Error saving user:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: isEdit ? "Update Failed" : "Add Failed",
        text: `User ${isEdit ? "Update" : "Add"} Failed`,
      });
      setShowForm(false);
    }
  };

  return (
    <div className="h-full flex flex-col px-6">
      {isLoading && <div>Loading...</div>}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          onClick={openAddUserForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div
        className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1"
        style={{ maxHeight: "320px" }}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">User Number</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              {!selectedCompanyId && <th className="py-3 px-4">Company</th>}
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(
                (u) =>
                  u.userNumber.toLowerCase().includes(search.toLowerCase()) ||
                  u.userMail.toLowerCase().includes(search.toLowerCase())
              )
              .map((u) => (
                <tr key={u.userNumber} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{u.userNumber}</td>
                  <td className="py-2 px-4">{u.userMail}</td>
                  <td className="py-2 px-4">{u.role}</td>
                  {!selectedCompanyId && (
                    <td className="py-2 px-4">{getCompanyAcronym(u.companyId)}</td>
                  )}
                  <td className="py-2 px-4">{getDepartmentAcronym(u.departmentId)}</td>
                  <td className="py-2 px-4 flex gap-2">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                      onClick={() => {
                        setFormData(u);
                        setAutoGenerate(false);
                        setShowForm(true);
                        setIsEdit(true);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                      onClick={() => {
                        Swal.fire({
                          title: "Are you sure?",
                          text: "You won't be able to revert this!",
                          icon: "warning",
                          showCancelButton: true,
                          confirmButtonColor: "#3085d6",
                          cancelButtonColor: "#d33",
                          confirmButtonText: "Yes, delete it!",
                        }).then(async (result) => {
                          if (result.isConfirmed) {
                            try {
                              await axios.delete(
                                `http://localhost:5000/api/users/${u.userNumber}`,
                                {
                                  data: { updatedBy: userNumber },
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );
                              Swal.fire({
                                title: "Deleted!",
                                text: "User has been deleted.",
                                icon: "success",
                              });
                              setRefreshFlag((prev) => !prev);
                            } catch (err) {
                              console.error("Delete error:", err.response?.data || err.message);
                              Swal.fire({
                                title: "Error!",
                                text: "Failed to delete user.",
                                icon: "error",
                              });
                            }
                          }
                        });
                      }}
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            {users.filter(
              (u) =>
                u.userNumber.toLowerCase().includes(search.toLowerCase()) ||
                u.userMail.toLowerCase().includes(search.toLowerCase())
            ).length === 0 && (
              <tr>
                <td
                  colSpan={selectedCompanyId ? 5 : 6}
                  className="text-center py-4 text-gray-500"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddOrEditUser
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          departments={departments}
          setDepartments={setDepartments}
          selectedCompanyName={selectedCompanyName}
          selectedCompanyId={selectedCompanyId}
          userRole={currentUserRole}
          companies={companies}
          autoGenerate={autoGenerate}
          setAutoGenerate={setAutoGenerate} // Pass setAutoGenerate
          handleAutoGenerate={handleAutoGenerate}
          isEdit={isEdit}
        />
      )}
    </div>
  );
}
