import React, { useEffect, useMemo, useState } from "react";
import { HandCoins } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import SalaryComponentForm from "../components/features/masters/SalaryComponentForm";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();

export default function SalaryComponentMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [salaryComponents, setSalaryComponents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const effectiveSelectedCompanyId =
    selectedCompanyId || user?.companyId || user?.company?.companyId || "";
  const hasCompanyScope = isSuperAdmin || Boolean(effectiveSelectedCompanyId);

  const fetchCompanies = async () => {
    try {
      const res = await API.get("/companies");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      toast.error("Could not load companies");
    }
  };

  const fetchSalaryComponents = async () => {
    try {
      const params = effectiveSelectedCompanyId ? { companyId: effectiveSelectedCompanyId } : {};
      const res = await API.get("/salaryComponents", { params });
      let data = Array.isArray(res.data) ? res.data : [];

      if (effectiveSelectedCompanyId) {
        data = data.filter((d) => String(d.companyId) === String(effectiveSelectedCompanyId));
      }

      data = data
        .map((d) => ({ ...d, status: d.deletedAt ? "Inactive" : d.status || "Active" }))
        .filter((d) => String(d.status || "").trim().toLowerCase() === "active");

      setSalaryComponents(data);
    } catch (err) {
      console.error("Error fetching salary components:", err);
      toast.error("Could not load salary components");
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchSalaryComponents();
  }, [effectiveSelectedCompanyId]);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return salaryComponents.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.code?.toLowerCase().includes(query) ||
        c.type?.toLowerCase().includes(query) ||
        c.calculationType?.toLowerCase().includes(query)
    );
  }, [salaryComponents, search]);

  const getCompanyAcronym = (id) =>
    companies.find((c) => String(c.companyId) === String(id))?.companyAcr || "";

  const getValuePreview = (component) => {
    if (component.type === "Earning") return "Assigned per employee";
    if (component.calculationType === "Formula") return "Formula";
    return "-";
  };

  const handleSave = async (payload, salaryComponentId) => {
    if (!hasCompanyScope && !isSuperAdmin) {
      return toast.error("Select a company first");
    }

    try {
      if (salaryComponentId) {
        await API.put(`/salaryComponents/${salaryComponentId}`, payload);
        Swal.fire("Updated!", "Salary component updated successfully", "success");
      } else {
        await API.post("/salaryComponents", payload);
        Swal.fire("Added!", "Salary component added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchSalaryComponents();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleEdit = (component) => {
    let companyName = selectedCompanyName || "";
    if (!companyName) {
      const company = companies.find((c) => String(c.companyId) === String(component.companyId));
      companyName = company?.companyName || "";
    }
    setEditData({ ...component, companyName });
    setShowForm(true);
  };

  const handleDelete = (salaryComponentId) => {
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
          await API.delete(`/salaryComponents/${salaryComponentId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Salary component has been deleted.", "success");
          fetchSalaryComponents();
        } catch (err) {
          console.error("Error deleting salary component:", err);
          Swal.fire("Error!", "Failed to delete salary component.", "error");
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={() => {
          if (!hasCompanyScope && !isSuperAdmin) return toast.error("Select a company first");
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search salary component..."
        buttonText="Add Salary Component"
      />

      {!hasCompanyScope && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm mb-4">
          Select a company before accessing Salary Component Master actions.
        </div>
      )}

      <MasterTable
        columns={[
          "Name",
          "Code",
          "Type",
          "Calculation",
          "Value",
          "Display Order",
          ...(!effectiveSelectedCompanyId ? ["Company"] : []),
          "Actions",
        ]}
      >
        {filteredData.map((c) => (
          <tr key={c.salaryComponentId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{c.name}</td>
            <td className="py-3 px-4">{c.code}</td>
            <td className="py-3 px-4">{c.type}</td>
            <td className="py-3 px-4">{c.calculationType}</td>
            <td className="py-3 px-4">{getValuePreview(c)}</td>
            <td className="py-3 px-4">{c.displayOrder}</td>
            {!effectiveSelectedCompanyId && (
              <td className="py-3 px-4">{getCompanyAcronym(c.companyId)}</td>
            )}
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => handleEdit(c)}
                onDelete={() => handleDelete(c.salaryComponentId)}
              />
            </td>
          </tr>
        ))}

        {filteredData.length === 0 && (
          <tr>
            <td
              colSpan={effectiveSelectedCompanyId ? 7 : 8}
              className="text-center py-4 text-gray-500"
            >
              No salary components found
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
        title={editData ? "Edit Salary Component" : "Add New Salary Component"}
        icon={HandCoins}
        maxWidth="max-w-4xl"
      >
        <SalaryComponentForm
          editData={editData}
          userRole={userRole || user?.role}
          selectedCompanyId={effectiveSelectedCompanyId}
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
