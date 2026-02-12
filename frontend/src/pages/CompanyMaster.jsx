import React, { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import CompanyForm from "../components/features/masters/CompanyForm";

export default function CompanyMaster() {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const isSuperAdmin = user?.role === "Super Admin";

  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchCompanies = async () => {
    try {
      const res = await API.get("/companies");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      toast.error("Could not load companies");
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    const id = setTimeout(() => {
      fetchCompanies();
    }, 0);

    return () => clearTimeout(id);
  }, [isSuperAdmin]);

  const filteredData = companies.filter(
    (c) =>
      c.companyName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.companyAcr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (payload, companyId) => {
    try {
      if (companyId) {
        await API.put(`/companies/${companyId}`, payload);
        Swal.fire("Updated!", "Company updated successfully", "success");
      } else {
        await API.post("/companies", payload);
        Swal.fire("Added!", "Company added successfully", "success");
      }

      setShowForm(false);
      setEditData(null);
      fetchCompanies();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (companyId) => {
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
          await API.delete(`/companies/${companyId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Company has been deleted.", "success");
          fetchCompanies();
        } catch (err) {
          console.error("Error deleting company:", err);
          Swal.fire("Error!", "Failed to delete company.", "error");
        }
      }
    });
  };

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-gray-600">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={() => {
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search company..."
        buttonText="Add Company"
      />

      <MasterTable columns={["ID", "Name", "Acronym", "Status", "Actions"]}>
        {filteredData.map((c) => (
          <tr key={c.companyId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{c.companyId}</td>
            <td className="py-3 px-4">{c.companyName}</td>
            <td className="py-3 px-4">{c.companyAcr}</td>
            <td className="py-3 px-4">{c.status}</td>
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setEditData(c);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(c.companyId)}
              />
            </td>
          </tr>
        ))}

        {filteredData.length === 0 && (
          <tr>
            <td colSpan={5} className="text-center py-4 text-gray-500">
              No companies found
            </td>
          </tr>
        )}
      </MasterTable>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
        title={editData ? "Edit Company" : "Add New Company"}
        icon={Building2}
      >
        <CompanyForm
          editData={editData}
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
