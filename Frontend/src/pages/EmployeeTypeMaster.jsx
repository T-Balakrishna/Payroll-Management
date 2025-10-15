import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2';
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";
let userRole = decoded?.role;

// ✅ Modal Form Component
function AddOrEditEmployeeType({ onSave, onCancel, editData, userRole, selectedCompanyId, selectedCompanyName }) {
  const [employeeTypeName, setEmployeeTypeName] = useState(editData?.employeeTypeName || "");
  const [employeeTypeAckr, setEmployeeTypeAckr] = useState(editData?.employeeTypeAckr || "");
  const [status, setStatus] = useState(editData?.status || "active");
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(editData?.companyId || selectedCompanyId || "");
  const [companyName, setCompanyName] = useState(editData?.companyName || selectedCompanyName || "");

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setCompanies(res.data || []);
        if (userRole === "Super Admin" && selectedCompanyId) {
          setCompanyId(selectedCompanyId);
          const selected = res.data.find(c => c.companyId === selectedCompanyId);
          setCompanyName(selected ? selected.companyName : selectedCompanyName || "");
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    if (userRole === "Super Admin") fetchCompanies();
    else if (userRole === "Admin" && selectedCompanyId) {
      setCompanyId(selectedCompanyId);
      setCompanyName(selectedCompanyName || "No company selected");
    }
    return () => { mounted = false; };
  }, [userRole, selectedCompanyId, selectedCompanyName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeTypeName || !employeeTypeAckr) return toast.error("Please fill Employee Type Name and Acronym");
    if (userRole === "Super Admin" && !companyId) return toast.error("Please select a company");

    const employeeTypeData = {
      employeeTypeName,
      employeeTypeAckr,
      status,
      companyId,
      createdBy: editData ? editData.createdBy : userNumber,
      updatedBy: userNumber,
    };
    onSave(employeeTypeData, editData?.employeeTypeId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={22} />
        </button>
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Users className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Employee Type" : "Add New Employee Type"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Employee Type Name</label>
            <input
              type="text"
              value={employeeTypeName}
              onChange={(e) => setEmployeeTypeName(e.target.value)}
              placeholder="Enter employee type name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">Acronym</label>
            <input
              type="text"
              value={employeeTypeAckr}
              onChange={(e) => setEmployeeTypeAckr(e.target.value)}
              placeholder="Enter acronym"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">Company</label>
            {userRole === "Super Admin" ? (
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  const selected = companies.find((c) => c.companyId === e.target.value);
                  setCompanyName(selected ? selected.companyName : "");
                }}
                // disabled
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
                value={companyName || "No company selected"}
                disabled
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 cursor-not-allowed"
              />
            )}
          </div>
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
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ Main Component
function EmployeeTypeMaster({ selectedCompanyId, selectedCompanyName }) {
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchEmployeeTypes = async () => {
    try {
      let url = "http://localhost:5000/api/employeeTypes";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      let data = res.data || [];
      if (selectedCompanyId && Array.isArray(data)) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setEmployeeTypes(data);
    } catch (err) {
      console.error("Error fetching employee types:", err);
    }
  };

  useEffect(() => {
    fetchEmployeeTypes();
  }, [selectedCompanyId]);

  const getCompanyAcronym = (id) => {
    const company = companies.find(c => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  const filteredData = employeeTypes.filter(
    (d) =>
      d.employeeTypeName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.employeeTypeAckr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (employeeTypeData, employeeTypeId) => {
    try {
      if (employeeTypeId) {
        const res = await axios.put(
          `http://localhost:5000/api/employeeTypes/${employeeTypeId}`,
          { ...employeeTypeData, updatedBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const res = await axios.post(
          "http://localhost:5000/api/employeeTypes",
          { ...employeeTypeData, createdBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      await fetchEmployeeTypes();
      setShowForm(false);
      setEditData(null);
      Swal.fire({
        icon: "success",
        title: employeeTypeId ? "Updated" : "Added",
        text: `Employee Type ${employeeTypeId ? "Updated" : "Added"} Successfully`
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: `${employeeTypeId ? "Update" : "Add"} Failed`,
        text:`${err.response.data==="Error updating employee type: Validation error" || err.response.data==="Error creating employee type: Validation error"?"Designation Already exists in the Company":err.response.data}`
      });
      setShowForm(false);
      console.error("Error saving employee type:", err.response?.data);
    }
  };

  const handleEdit = async (employeeType) => {
    try {
      const res = await axios.get("http://localhost:5000/api/companies", { headers: { Authorization: `Bearer ${token}` } });
      const company = res.data.find((c) => c.companyId === employeeType.companyId);
      setEditData({ ...employeeType, companyName: company ? company.companyName : selectedCompanyName || "" });
      setShowForm(true);
    } catch (err) {
      console.error("Error fetching company for edit:", err);
      setEditData({ ...employeeType, companyName: selectedCompanyName || "" });
      setShowForm(true);
    }
  };

  const handleDelete = async (employeeTypeId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won’t be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/api/employeeTypes/${employeeTypeId}`, {
            data: { updatedBy: userNumber },
            headers: { Authorization: `Bearer ${token}` },
          });

          Swal.fire("Deleted!", "Employee Type has been deleted.", "success");
          await fetchEmployeeTypes();
        } catch (err) {
          console.error("Error deleting employee type:", err);
          Swal.fire("Error!", "Failed to delete employee type.", "error");
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col px-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search employee type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => { setShowForm(true); setEditData(null); }}
        >
          <Plus size={18} /> Add Employee Type
        </button>
      </div>
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Acronym</th>
              {!selectedCompanyId && <th className="py-3 px-4">Company</th>}
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d) => (
              <tr key={d.employeeTypeId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{d.employeeTypeName}</td>
                <td className="py-2 px-4">{d.employeeTypeAckr}</td>
                {!selectedCompanyId && <td>{getCompanyAcronym(d.companyId)}</td>}
                <td className="py-2 px-4 flex gap-2">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md" onClick={() => handleEdit(d)}>
                    <Pencil size={16} />
                  </button>
                  <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md" onClick={() => handleDelete(d.employeeTypeId)}>
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No employee types found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <AddOrEditEmployeeType
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditData(null); }}
          editData={editData}
          userRole={userRole}
          selectedCompanyId={selectedCompanyId}
          selectedCompanyName={selectedCompanyName}
        />
      )}
    </div>
  );
}

export default EmployeeTypeMaster;