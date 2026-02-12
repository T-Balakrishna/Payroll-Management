import React, { useCallback, useEffect, useMemo, useState } from "react";
import { List } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import EmployeeGradeForm from "../components/features/masters/EmployeeGradeForm";

export default function EmployeeGradeMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const effectiveSelectedCompanyId =
    selectedCompanyId || user?.companyId || user?.company?.companyId || "";
  const hasCompanyScope = Boolean(effectiveSelectedCompanyId);

  const fetchGrades = useCallback(async () => {
    if (!hasCompanyScope) {
      setGrades([]);
      return;
    }

    try {
      const res = await API.get("/employeeGrades", {
        params: { companyId: effectiveSelectedCompanyId },
      });
      setGrades(res.data || []);
    } catch (err) {
      console.error("Error fetching employee grades:", err);
      toast.error("Could not load employee grades");
    }
  }, [effectiveSelectedCompanyId, hasCompanyScope]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchGrades();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchGrades]);

  const filteredData = useMemo(
    () =>
      grades.filter(
        (g) =>
          g.employeeGradeName?.toLowerCase().includes(search.trim().toLowerCase()) ||
          g.employeeGradeAcr?.toLowerCase().includes(search.trim().toLowerCase()) ||
          g.status?.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [grades, search]
  );

  const handleSave = async (payload, employeeGradeId) => {
    if (!hasCompanyScope) return toast.error("Select a company first");

    try {
      if (employeeGradeId) {
        await API.put(`/employeeGrades/${employeeGradeId}`, payload);
        Swal.fire("Updated!", "Employee grade updated successfully", "success");
      } else {
        await API.post("/employeeGrades", payload);
        Swal.fire("Added!", "Employee grade added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchGrades();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (employeeGradeId) => {
    if (!hasCompanyScope) return toast.error("Select a company first");

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
          await API.delete(`/employeeGrades/${employeeGradeId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Employee grade has been deleted.", "success");
          fetchGrades();
        } catch (err) {
          console.error("Error deleting employee grade:", err);
          Swal.fire("Error!", "Failed to delete employee grade.", "error");
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
          if (!hasCompanyScope) return toast.error("Select a company first");
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search employee grade..."
        buttonText="Add Employee Grade"
      />

      {!hasCompanyScope && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm mb-4">
          Select a company before accessing Employee Grade Master actions.
        </div>
      )}

      <MasterTable columns={["Name", "Acronym", "Status", "Actions"]}>
        {filteredData.map((g) => (
          <tr key={g.employeeGradeId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{g.employeeGradeName}</td>
            <td className="py-3 px-4">{g.employeeGradeAcr}</td>
            <td className="py-3 px-4">{g.status}</td>
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setEditData(g);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(g.employeeGradeId)}
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
        title={editData ? "Edit Employee Grade" : "Add New Employee Grade"}
        icon={List}
      >
        <EmployeeGradeForm
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
