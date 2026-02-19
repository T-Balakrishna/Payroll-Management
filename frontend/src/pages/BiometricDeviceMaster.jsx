import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Monitor } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import BiometricDeviceForm from "../components/features/masters/BiometricDeviceForm";

export default function BiometricDeviceMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [devices, setDevices] = useState([]);
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

  const fetchDevices = useCallback(async () => {
    try {
      const res = await API.get("/biometricDevices", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      });
      let data = res.data || [];
      if (selectedCompanyId) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setDevices(data);
    } catch (err) {
      console.error("Error fetching biometric devices:", err);
      toast.error("Could not load biometric devices");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchDevices();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchDevices]);

  const filteredData = useMemo(
    () =>
      devices.filter(
        (d) =>
          d.name?.toLowerCase().includes(search.trim().toLowerCase()) ||
          d.deviceIp?.toLowerCase().includes(search.trim().toLowerCase()) ||
          d.location?.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [devices, search]
  );

  const handleSave = async (payload, deviceId) => {
    try {
      if (deviceId) {
        await API.put(`/biometricDevices/${deviceId}`, payload);
        Swal.fire("Updated!", "Biometric device updated successfully", "success");
      } else {
        await API.post("/biometricDevices", payload);
        Swal.fire("Added!", "Biometric device added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchDevices();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (deviceId) => {
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
          await API.delete(`/biometricDevices/${deviceId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Biometric device has been deleted.", "success");
          fetchDevices();
        } catch (err) {
          console.error("Error deleting biometric device:", err);
          Swal.fire("Error!", "Failed to delete biometric device.", "error");
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
        placeholder="Search biometric device..."
        buttonText="Add Biometric Device"
      />

      <MasterTable
        columns={[
          "Name",
          "IP",
          "Location",
          "Auto Sync",
          ...(!selectedCompanyId ? ["Company"] : []),
          "Actions",
        ]}
      >
        {filteredData.map((d) => (
          <tr key={d.deviceId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{d.name}</td>
            <td className="py-3 px-4">{d.deviceIp}</td>
            <td className="py-3 px-4">{d.location}</td>
            <td className="py-3 px-4">{d.isAutoSyncEnabled ? "Enabled" : "Disabled"}</td>
            {!selectedCompanyId && <td className="py-3 px-4">{getCompanyAcronym(d.companyId)}</td>}
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setEditData(d);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(d.deviceId)}
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
        title={editData ? "Edit Biometric Device" : "Add New Biometric Device"}
        icon={Monitor}
      >
        <BiometricDeviceForm
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
