import React, { useState, useEffect } from "react";
import { Building2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";

import DepartmentForm from "../components/features/masters/DepartmentForm";

export default function DepartmentMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await API.get("/companies");
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await API.get("/departments", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
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
      d.departmentAcr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (payload, departmentId) => {
    try {
      if (departmentId) {
        await API.put(`/departments/${departmentId}`, payload);
        Swal.fire("Updated!", "Department updated successfully", "success");
      } else {
        await API.post("/departments", payload);
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
          await API.delete(`/departments/${departmentId}`, {
            data: { updatedBy: currentUserId },
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
            <td className="py-3 px-4">{d.departmentAcr}</td>
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