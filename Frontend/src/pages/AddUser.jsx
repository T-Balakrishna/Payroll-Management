import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Search, Plus, X, Trash, Pencil, Cpu } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";

// 🔹 Modal Component
function AddOrEditUser({
  formData,
  setFormData,
  onSave,
  onCancel,
  departments,
  selectedCompanyName,
  selectedCompanyId,
  userRole,
  companies,
  autoGenerate,
  handleAutoGenerate,
  isEdit,
}) {
  
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "role") {
      if (value === "Admin" && userRole === "Super Admin") {
        setFormData({
          ...formData,
          role: value,
          departmentId: 1,
        });
      } else if (value === "Super Admin") {
        setFormData({
          ...formData,
          role: value,
          companyId: 1,
          departmentId: 1,
        });
      } else {
        setFormData({ ...formData, role: value, departmentId: "" });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Update departments when company changes
  // useEffect(() => {
  //   const fetchDepartments = async () => {
  //     if (!formData.companyId) return setDepartments([]);
  //     try {
  //       const res = await axios.get(
  //         `http://localhost:5000/api/departments?companyId=${formData.companyId}`,
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );
  //       setDepartments(res.data);
  //     } catch (err) {
  //       toast.error("Error fetching departments");
  //     }
  //   };
  //   fetchDepartments();
  // }, [formData.companyId, token]);


  const showCompanyField = () => {
    if (userRole === "Super Admin") {
      // Case 1: Super Admin creating another Super Admin → no dropdown
      if (formData.role === "Super Admin") return false;
      // Case 2: Super Admin creating Admin → show dropdown
      return true;
    }

    if (userRole === "Admin") {
      // Case 3: Admin creating Admin → no dropdown
      if (formData.role === "Admin") return false;
    }

    return false; // default safeguard
  };

  const showDepartmentField = () => {
    return formData.role === "Staff" || formData.role === "Department Admin";
  };

  return (
  <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 py-2 relative">
      <button
        onClick={onCancel}
        className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition"
      >
        <X size={20} />
      </button>

      <div className="flex justify-center mb-6">
        <div className="bg-blue-100  rounded-full">
          <Cpu className="text-blue-600" size={40} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
        {isEdit ? "Edit User" : "Add New User"}
      </h2>

      <form onSubmit={onSave} className="space-y-0.5">
        {/* Email */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="userMail"
            placeholder="Email"
            value={formData.userMail}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            required={!formData.userNumber}
          />
        </div>

        {/* Role */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
            <label className="block font-medium text-gray-700 mb-1">Company</label>
            {userRole === "Super Admin" ? (
              <select
                value={formData.companyId || ""}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    companyId: e.target.value,
                    departmentId: "", 
                  });
                }}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select Company</option>
                {companies
                  .filter(c => c.companyId !== 1)
                  .map(c => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedCompanyName || "No company selected"}
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 cursor-not-allowed"
                readOnly
              />
            )}
          </div>
        )}

        {/* Department */}
        {showDepartmentField() && (
          <div>
            <label className="block font-medium text-gray-700 mb-1">Department</label>
            <select
              name="departmentId"
              value={formData.departmentId ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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

        {/* User Number */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">User Number</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="userNumber"
              placeholder="User Number"
              value={formData.userNumber}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              disabled={autoGenerate || isEdit}
              required
            />
            <label className="flex items-center gap-1">
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
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition"
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
    companyId:"",
    password: "",
  });
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [companies, setCompanies] = useState([]);

  const getCompanyAcronym = (id) => {
    const company = companies.find((c) => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  const getDepartmentAcronym = (id) => {
    // console.log(id,allDepartments);
    
    const dept = allDepartments.find((d) => d.departmentId === id);
    return dept ? dept.departmentAckr : "";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companyRes = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(companyRes.data);

        let deptRes;
        if(selectedCompanyId){
            deptRes = await axios.get(
              `http://localhost:5000/api/departments?companyId=${selectedCompanyId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
         }
         else{
            deptRes = await axios.get(
              `http://localhost:5000/api/departments`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
         }
        setDepartments(deptRes.data);

        let url = "http://localhost:5000/api/users";
        if (selectedCompanyId) {
          url += `?companyId=${selectedCompanyId}`;
        }
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);

        const allDept = await axios.get(
              `http://localhost:5000/api/departments`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
        setAllDepartments(allDept.data);
      } catch (err) {
        toast.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [selectedCompanyId, token,refreshFlag]);

    useEffect(() => {
    const fetchDepartments = async () => {
      if (!formData.companyId) return setDepartments([]);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/departments?companyId=${formData.companyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDepartments(res.data);
      } catch (err) {
        toast.error("Error fetching departments");
      }
    };

    fetchDepartments();
  }, [formData.companyId, token]);


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
      password: "",
      companyId:"",
    });
    setAutoGenerate(false);
    setIsEdit(false);
    setShowForm(true);
  };

  const handleAutoGenerate = async (checked, departmentId) => {
    setAutoGenerate(checked);
    if (!checked) return setFormData((prev) => ({ ...prev, userNumber: "" }));

    try {
      const res = await axios.post(
        `http://localhost:5000/api/users/lastEmpNumber/${departmentId}`,
        { 
          role: formData.role,
          companyId: formData.companyId ? formData.companyId : (formData.role==="Super Admin"?1:selectedCompanyId),
          departmentId: formData.departmentId ? formData.departmentId : 1,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData((prev) => ({ ...prev, userNumber: res.data.lastEmpNumber }));
    } catch (err) {
      toast.error("Error generating userNumber:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      companyId:
        formData.companyId == null // null or undefined
          ? (currentUserRole === "Super Admin" && formData.role === "Super Admin" ? 1 : selectedCompanyId)
          : selectedCompanyId,
      departmentId:
        formData.departmentId == null // null or undefined
          ? ((currentUserRole === "Super Admin" && (formData.role === "Super Admin" || formData.role === "Admin")) ||
            (currentUserRole === "Admin" && formData.role === "Admin")
            ? 1
            : formData.departmentId)
          : formData.departmentId,
    };


    try {
      if (!payload.companyId) payload.companyId = 1;
      if (!payload.departmentId) payload.departmentId = 1;

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
      setRefreshFlag((prev)=>!prev);
    } catch (err) {
      Swal.fire({
              icon: "error",
              title: isEdit ? "Update Failed" : "Add Failed" ,
              text: `User ${isEdit ? "Update" : "Add"} Failed`,
            });
      setShowForm(false);
    }
  };

  return (
    <div className="h-full flex flex-col px-6">
      
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
                              confirmButtonText: "Yes, delete it!"
                            }).then(async (result) => {
                              if (result.isConfirmed) {
                                try {
                                  await axios.delete(
                                    `http://localhost:5000/api/users/${u.userNumber}`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );

                                  Swal.fire({
                                    title: "Deleted!",
                                    text: "User has been deleted.",
                                    icon: "success",
                                  });

                                  window.location.reload(); // 🔄 keep your old reload
                                } catch (err) {
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
          selectedCompanyName={selectedCompanyName}
          selectedCompanyId={selectedCompanyId}
          userRole={currentUserRole}
          companies={companies}
          autoGenerate={autoGenerate}
          handleAutoGenerate={handleAutoGenerate}
          isEdit={isEdit}
        />
      )}
    </div>
  );
}