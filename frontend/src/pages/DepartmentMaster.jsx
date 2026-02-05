import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";

import DepartmentForm from "../components/features/masters/department/DepartmentForm";

let token = sessionStorage.getItem("token");
let userNumber = token ? jwtDecode(token)?.userNumber : "system";

export default function DepartmentMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

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

  const fetchDepartments = async () => {
    try {
      let url = "http://localhost:5000/api/departments";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = res.data || [];
      if (selectedCompanyId) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Could not load departments");
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [selectedCompanyId]);

  const filteredData = departments.filter(
    (d) =>
      d.departmentName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.departmentAckr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (payload, departmentId) => {
    try {
      if (departmentId) {
        await axios.put(`http://localhost:5000/api/departments/${departmentId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Updated!", "Department updated successfully", "success");
      } else {
        await axios.post("http://localhost:5000/api/departments", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Added!", "Department added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchDepartments();
    } catch (err) {
      const msg = err.response?.data || "Operation failed";
      const text = msg.includes("Validation error") ? "Department already exists in this company" : msg;
      Swal.fire("Error", text, "error");
    }
  };

  const handleEdit = async (department) => {
    let companyName = selectedCompanyName || "";
    if (companies.length > 0) {
      const company = companies.find((c) => c.companyId === department.companyId);
      if (company) companyName = company.companyName;
    }
    setEditData({ ...department, companyName });
    setShowForm(true);
  };

  const handleDelete = (departmentId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/api/departments/${departmentId}`, {
            data: { updatedBy: userNumber },
            headers: { Authorization: `Bearer ${token}` },
          });
          Swal.fire("Deleted!", "Department has been deleted.", "success");
          fetchDepartments();
        } catch (err) {
          Swal.fire("Error!", "Failed to delete department.", "error");
        }
      }
    });
  };

  const getCompanyAcronym = (id) => {
    return companies.find((c) => c.companyId === id)?.companyAcr || "";
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={() => {
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search department..."
        buttonText="Add Department"
      />

      <MasterTable
        columns={["Name", "Acronym", ...(!selectedCompanyId ? ["Company"] : []), "Actions"]}
      >
        {filteredData.map((d) => (
          <tr key={d.departmentId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{d.departmentName}</td>
            <td className="py-3 px-4">{d.departmentAckr}</td>
            {!selectedCompanyId && <td className="py-3 px-4">{getCompanyAcronym(d.companyId)}</td>}
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => handleEdit(d)}
                onDelete={() => handleDelete(d.departmentId)}
              />
            </td>
          </tr>
        ))}
      </MasterTable>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
        title={editData ? "Edit Department" : "Add New Department"}
        icon={Building2}
      >
        <DepartmentForm
          editData={editData}
          userRole={userRole}
          selectedCompanyId={selectedCompanyId}
          selectedCompanyName={selectedCompanyName}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
        />
      </Modal>
    </div>
  );
}