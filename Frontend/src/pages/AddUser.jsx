import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AddUser({ adminName }) {
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    userMail: "",
    userNumber: "",
    role: "",
    departmentId: "",
    password: "",
  });
  const [autoGenerate, setAutoGenerate] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:5000/api/departments")
      .then(res => setDepartments(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutoGenerate = async (checked) => {
    setAutoGenerate(checked);

    if (checked && formData.departmentId) {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/lastEmpNumber/${formData.departmentId}`);
        const lastEmp = res.data?.userNumber || null;
        const department = departments.find(d => d.departmentId === parseInt(formData.departmentId));
        let newEmpNum = lastEmp
          ? `${department.departmentAckr.toLowerCase()}${parseInt(lastEmp.replace(/\D/g, "")) + 1}`
          : `${department.departmentAckr.toLowerCase()}1`;

        setFormData(prev => ({ ...prev, userNumber: newEmpNum }));
      } catch (err) {
        console.error("Error generating userNumber:", err);
      }
    } else {
      setFormData(prev => ({ ...prev, userNumber: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.userId) {
        // Update
        await axios.put(`http://localhost:5000/api/users/${formData.userId}`, {
          ...formData,
          updatedBy: adminName,
        });
        alert("User updated successfully!");
      } else {
        // Create
        await axios.post("http://localhost:5000/api/users", {
          ...formData,
          createdBy: adminName,
        });
        alert("User added successfully!");
      }

      setFormData({
        userMail: "",
        userNumber: "",
        role: "",
        departmentId: "",
        password: "",
      });
      setAutoGenerate(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-4 flex justify-center align-center">Add User</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="userMail"
          placeholder="Email"
          value={formData.userMail}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Role</option>
          <option value="Staff">Staff</option>
          <option value="Admin">Admin</option>
          <option value="Super Admin">Super Admin</option>
        </select>

        {autoGenerate && (
        <select name="departmentId" value={formData.departmentId} onChange={handleChange}
          className="w-full p-2 border rounded" required>
          <option value="">Select Department</option>
          {departments.map(department => (
            <option key={department.departmentId} value={department.departmentId}>{department.departmentAckr}</option>
          ))}
        </select>
)}

        <div className="flex items-center gap-2">
          <input
            type="text"
            name="userNumber"
            placeholder="User Number"
            value={formData.userNumber}
            onChange={handleChange}
            className="w-full p-2 border rounded"
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

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
}