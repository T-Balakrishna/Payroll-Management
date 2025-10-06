import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash, Plus, X } from "lucide-react";
import Swal from 'sweetalert2'
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : {};
let userNumber = decoded.userNumber;
let userRole = decoded.role;


// ✅ Modal Form Component
function AddOrEditCompany({ onSave, onCancel, editData }) {
  const [companyName, setCompanyName] = useState(editData?.companyName || "");
  const [companyAcr, setCompanyAcr] = useState(editData?.companyAcr || "");
  const [status, setStatus] = useState(editData?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName || !companyAcr) return alert("Please fill all fields");

    const adminName = userNumber

    const companyData = {
      companyName,
      companyAcr: companyAcr.toUpperCase(),
      status,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };

    onSave(companyData, editData?.companyId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X size={22} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Building2 className="text-blue-600" size={40} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Company" : "Add New Company"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Acronym</label>
            <input
              type="text"
              value={companyAcr}
              onChange={(e) => setCompanyAcr(e.target.value)}
              placeholder="Enter short name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition">
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ Main Component
function CompanyMaster({ refreshCompanies }) {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/companies");
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredData = companies.filter(
    (c) =>
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyAcr?.toLowerCase().includes(search.toLowerCase()) ||
      c.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (companyData, companyId) => {
    try {
      if (companyId) {
        await axios.put(`http://localhost:5000/api/companies/${companyId}`, companyData, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
      } else {
        await axios.post(`http://localhost:5000/api/companies`, companyData, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
      }
      Swal.fire({
            icon: "success",
            title: `${companyId ? "Updated" : "Added"}`,
            text: `Company ${companyId ? "Updated" : "Added"} Successfully`,
          });

      // ✅ Refresh local and parent data
      fetchCompanies();
      if (refreshCompanies) refreshCompanies();

      setShowForm(false);
      setEditData(null);
    } catch (err) {
      Swal.fire({
            icon: "error",
            title: `${companyId ? "Update" : "Add"}Failed`,
            // text: `Department ${departmentId ? "Updated" : "Added"} Successfully`,
            text:`${err.response.data}`
        });
      // alert("Error saving company:", err.message);
    }
  };

  const handleEdit = (company) => {
    setEditData(company);
    setShowForm(true);
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm("Are you sure you want to deactivate this company?")) return;
    try {
      const updatedBy = sessionStorage.getItem("userNumber");
      await axios.delete(`http://localhost:5000/api/companies/${companyId}`, {
        data: { updatedBy },
      });
      fetchCompanies();
      if (refreshCompanies) refreshCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col px-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          <Plus size={18} /> Add Company
        </button>
      </div>

      <div
        className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1"
        style={{ maxHeight: "320px" }}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Acronym</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((c) => (
              <tr key={c.companyId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{c.companyId}</td>
                <td className="py-2 px-4">{c.companyName}</td>
                <td className="py-2 px-4">{c.companyAcr}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(c)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(c.companyId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddOrEditCompany
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
          editData={editData}
        />
      )}
    </div>
  );
}

export default CompanyMaster;
