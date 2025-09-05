import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pencil, Trash, Users } from "lucide-react";

function AddOrEditEmployeeType({ onSave, onCancel, editData }) {
  const [employeeTypeName, setEmployeeTypeName] = useState(editData?.empTypeName || "");
  const [employeeTypeShort, setEmployeeTypeShort] = useState(editData?.empTypeShort || ""); // ⭐ NEW STATE

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeTypeName || !employeeTypeShort) 
      return alert("Please enter employee type name and short name");

    onSave(
      { 
        empTypeName: employeeTypeName, 
        empTypeShort: employeeTypeShort 
      }, 
      editData?.empTypeId
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-purple-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center mb-4">
          <Users className="text-black-400" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">Employee Type Name</label>
            <input
              type="text"
              value={employeeTypeName}
              onChange={(e) => setEmployeeTypeName(e.target.value)}
              placeholder="Enter Employee Type Name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          
          <div>
            <label className="block font-bold text-black-300 mb-2">Employee Type Short</label>
            <input
              type="text"
              value={employeeTypeShort}
              onChange={(e) => setEmployeeTypeShort(e.target.value)}
              placeholder="Enter Short Code (e.g. HR, ENG)"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-400 text-white px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-700 text-white px-6 py-3 rounded-lg"
            >
              {editData ? "Update Changes" : "Save Changes"}
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
      type.empTypeName?.toLowerCase().includes(search.toLowerCase()) ||
      type.empTypeShort?.toLowerCase().includes(search.toLowerCase()) // ⭐ allow search by short code
  );

  const handleSave = async (data, empTypeId) => {
    try {
      if (empTypeId) {
        await axios.put(`http://localhost:5000/api/employeeTypes/${empTypeId}`, data);
      } else {
        await axios.post("http://localhost:5000/api/employeeTypes", data);
      }
      setShowForm(false);
      setEditData(null);
      fetchEmployeeTypes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (type) => {
    setEditData(type);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/employeeTypes/${id}`);
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
    <div className="min-h-screen p-6 flex flex-col justify-center align-center">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search employee types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-1/3 outline-none"
        />
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          + Add
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "260px" }}>
        <table className="w-full text-left border border-gray-300">
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Employee Type Name</th>
              <th className="py-2 px-4">Employee Type Short</th> 
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((type) => (
              <tr key={type.empTypeId} className="border-t">
                <td className="py-2 px-4">{type.empTypeId}</td>
                <td className="py-2 px-4">{type.empTypeName}</td>
                <td className="py-2 px-4">{type.empTypeShort}</td> 
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-yellow-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(type)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(type.empTypeId)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4"> 
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
