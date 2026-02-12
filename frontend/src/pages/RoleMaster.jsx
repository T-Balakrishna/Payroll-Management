import React, { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";
import Select from "../components/ui/Select";
import RoleForm from "../components/features/masters/RoleForm";

export default function RoleMaster() {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const role = user?.role || "";
  const isAdmin = role === "Admin";
  const isSuperAdmin = role === "Super Admin";

  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const canAccess = isAdmin || isSuperAdmin;
  const hasCompanyScope = isAdmin || Boolean(selectedCompanyId);

  const fetchRoles = async () => {
    try {
      const res = await API.get("/roles");
      setRoles(res.data || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error("Could not load roles");
    }
  };

  useEffect(() => {
    if (!canAccess) return;

    const id = setTimeout(() => {
      const load = async () => {
        try {
          if (isSuperAdmin) {
            const companyRes = await API.get("/companies");
            setCompanies(companyRes.data || []);
          } else if (isAdmin && user?.userNumber) {
            const companyRes = await API.get(`/users/getCompany/${user.userNumber}`);
            if (companyRes?.data?.companyId) {
              setSelectedCompanyId(String(companyRes.data.companyId));
            }
          }

          const roleRes = await API.get("/roles");
          setRoles(roleRes.data || []);
        } catch (err) {
          console.error("Error loading Role Master:", err);
          toast.error("Could not load role master data");
        }
      };

      load();
    }, 0);

    return () => clearTimeout(id);
  }, [canAccess, isAdmin, isSuperAdmin, user?.userNumber]);

  const filteredData = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.roleName?.toLowerCase().includes(search.trim().toLowerCase()) ||
          r.status?.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [roles, search]
  );

  const requireCompanyScope = () => {
    if (!hasCompanyScope) {
      toast.error("Select a company first");
      return false;
    }
    return true;
  };

  const handleSave = async (payload, roleId) => {
    if (!requireCompanyScope()) return;
    try {
      if (roleId) {
        await API.put(`/roles/${roleId}`, payload);
        Swal.fire("Updated!", "Role updated successfully", "success");
      } else {
        await API.post("/roles", payload);
        Swal.fire("Added!", "Role added successfully", "success");
      }
      setShowForm(false);
      setEditData(null);
      fetchRoles();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data ||
        "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDelete = (roleId) => {
    if (!requireCompanyScope()) return;

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
          await API.delete(`/roles/${roleId}`, {
            data: { updatedBy: currentUserId },
          });
          Swal.fire("Deleted!", "Role has been deleted.", "success");
          fetchRoles();
        } catch (err) {
          console.error("Error deleting role:", err);
          Swal.fire("Error!", "Failed to delete role.", "error");
        }
      }
    });
  };

  if (!canAccess) {
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
          if (!requireCompanyScope()) return;
          setEditData(null);
          setShowForm(true);
        }}
        placeholder="Search role..."
        buttonText="Add Role"
      />

      {!hasCompanyScope ? (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          Select a company before accessing Role Master actions.
        </div>
      ) : (
        <MasterTable columns={["ID", "Role Name", "Status", "Actions"]}>
          {filteredData.map((r) => (
            <tr key={r.roleId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{r.roleId}</td>
              <td className="py-3 px-4">{r.roleName}</td>
              <td className="py-3 px-4">{r.status}</td>
              <td className="py-3 px-4">
                <ActionButtons
                  onEdit={() => {
                    setEditData(r);
                    setShowForm(true);
                  }}
                  onDelete={() => handleDelete(r.roleId)}
                />
              </td>
            </tr>
          ))}

          {filteredData.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-gray-500">
                No roles found
              </td>
            </tr>
          )}
        </MasterTable>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
        title={editData ? "Edit Role" : "Add New Role"}
        icon={Shield}
      >
        <RoleForm
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
