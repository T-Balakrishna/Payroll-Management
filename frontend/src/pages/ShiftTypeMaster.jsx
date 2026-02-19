import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import ShiftTypeForm from "../components/features/masters/ShiftTypeForm";

const toDisplayTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  return raw.slice(0, 5);
};
const toDisplayWeeklyOff = (value) => {
  let days = value;
  if (typeof days === "string") {
    try {
      days = JSON.parse(days);
    } catch {
      days = [];
    }
  }
  if (!Array.isArray(days) || days.length === 0) return "--";
  return days.map((day) => String(day).slice(0, 1).toUpperCase() + String(day).slice(1)).join(", ");
};

export default function ShiftTypeMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [shiftTypes, setShiftTypes] = useState([]);
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

  const fetchShiftTypes = useCallback(async () => {
    try {
      const res = await API.get("/shiftTypes", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      });
      let data = res.data || [];
      if (selectedCompanyId) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setShiftTypes(data);
    } catch (err) {
      console.error("Error fetching shift types:", err);
      toast.error("Could not load shift types");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchShiftTypes();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchShiftTypes]);

  const filteredData = useMemo(
    () =>
      shiftTypes.filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          s.name?.toLowerCase().includes(q) ||
          s.workingHoursCalculation?.toLowerCase().includes(q)
        );
      }),
    [shiftTypes, search]
  );

  const handleSave = async (payload, shiftTypeId) => {
    try {
      if (shiftTypeId) {
        await API.put(`/shiftTypes/${shiftTypeId}`, payload);
        Swal.fire("Updated!", "Shift type updated successfully", "success");
      } else {
        await API.post("/shiftTypes", payload);
        Swal.fire("Added!", "Shift type added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchShiftTypes();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (shiftTypeId) => {
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
          await API.delete(`/shiftTypes/${shiftTypeId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Shift type has been deleted.", "success");
          fetchShiftTypes();
        } catch (err) {
          console.error("Error deleting shift type:", err);
          Swal.fire("Error!", "Failed to delete shift type.", "error");
        }
      }
    });
  };

  const getCompanyAcronym = (id) => {
    return companies.find((c) => String(c.companyId) === String(id))?.companyAcr || "";
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
        placeholder="Search shift type..."
        buttonText="Add Shift Type"
      />

      <MasterTable
        columns={[
          "Name",
          "Shift Time",
          "Weekly Off",
          "Working Hours Calculation",
          ...(!selectedCompanyId ? ["Company"] : []),
          "Actions",
        ]}
      >
        {filteredData.map((s) => (
          <tr key={s.shiftTypeId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{s.name}</td>
            <td className="py-3 px-4">{`${toDisplayTime(s.startTime)} - ${toDisplayTime(s.endTime)}`}</td>
            <td className="py-3 px-4">{toDisplayWeeklyOff(s.weeklyOff)}</td>
            <td className="py-3 px-4">{s.workingHoursCalculation}</td>
            {!selectedCompanyId && <td className="py-3 px-4">{getCompanyAcronym(s.companyId)}</td>}
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setEditData(s);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(s.shiftTypeId)}
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
        title={editData ? "Edit Shift Type" : "Add New Shift Type"}
        icon={Clock3}
        maxWidth="max-w-6xl"
      >
        <ShiftTypeForm
          editData={editData}
          userRole={userRole || user?.role}
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
