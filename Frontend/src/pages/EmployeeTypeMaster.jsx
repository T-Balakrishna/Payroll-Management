
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pencil, Trash, Users } from "lucide-react";


function AddOrEditEmployeeType({ onSave, onCancel, editData }) {
  const [employeeTypeName, setEmployeeTypeName] = useState(editData?.employeeTypeName || "");
  const [employeeTypeAckr, setEmployeeTypeAckr] = useState(editData?.employeeTypeAckr || "");


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeTypeName || !employeeTypeAckr)
      return alert("Please enter employee type name and short name");


    onSave(
      {
        employeeTypeName,
        employeeTypeAckr
      },
      editData?.employeeTypeId
    );
  };


  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="flex justify-center mb-4">
          <Users className="text-blue-600" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Employee Type" : "Add New Employee Type"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-gray-700 mb-2">Employee Type Name</label>
            <input
              type="text"
              value={employeeTypeName}
              onChange={(e) => setEmployeeTypeName(e.target.value)}
              placeholder="Enter employee type name"
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>


          <div>
            <label className="block font-bold text-gray-700 mb-2">Acronym</label>
            <input
              type="text"
              value={employeeTypeAckr}
              onChange={(e) => setEmployeeTypeAckr(e.target.value)}
              placeholder="Enter acronym"
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>


          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition"
            >
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default function EmployeeTypeMaster() {
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);


  const fetchEmployeeTypes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/employeeTypes");
      setEmployeeTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    fetchEmployeeTypes();
  }, []);


  const filteredData = employeeTypes.filter(
    (type) =>
      type.employeeTypeName?.toLowerCase().includes(search.toLowerCase()) ||
      type.employeeTypeAckr?.toLowerCase().includes(search.toLowerCase())
  );


  const handleSave = async (data, employeeTypeId) => {
    try {
      const adminName = sessionStorage.getItem("userNumber");


      if (employeeTypeId) {
        await axios.put(`http://localhost:5000/api/employeeTypes/${employeeTypeId}`, {
          ...data,
          updatedBy: adminName,
        });
      } else {
        await axios.post("http://localhost:5000/api/employeeTypes", {
          ...data,
          createdBy: adminName,
        });
      }


      setShowForm(false);
      setEditData(null);
      fetchEmployeeTypes();
    } catch (err) {
      console.error("❌ handleSave error:", err.response?.data || err.message);
    }
  };


  const handleEdit = (type) => {
    setEditData(type);
    setShowForm(true);
  };


  const handleDelete = async (id) => {
    const updatedBy=localStorage.getItem("adminName");
    try {
      await axios.delete(`http://localhost:5000/api/employeeTypes/${id}`, {
        data: { updatedBy},
      });
      fetchEmployeeTypes();
    } catch (err) {
      console.error(err);
    }
  };


  return showForm ? (
    <AddOrEditEmployeeType
      onSave={handleSave}
      onCancel={() => {
        setShowForm(false);
        setEditData(null);
      }}
      editData={editData}
    />
  ) : (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search employee types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg p-3 w-1/3 outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md transition"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          + Add
        </button>
      </div>


      <div className="overflow-y-auto border border-gray-300 rounded-lg shadow-md" style={{ maxHeight: "260px" }}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Employee Type Name</th>
              <th className="py-2 px-4">Employee Type Acronym</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((type) => (
              <tr key={type.employeeTypeId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{type.employeeTypeId}</td>
                <td className="py-2 px-4">{type.employeeTypeName}</td>
                <td className="py-2 px-4">{type.employeeTypeAckr}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow"
                    onClick={() => handleEdit(type)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md transition"
                    onClick={() => handleDelete(type.employeeTypeId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}