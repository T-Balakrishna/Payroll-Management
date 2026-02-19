import React, { useEffect, useMemo, useRef, useState } from "react";
import { Cpu } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";

function UserForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  userRole,
  companies,
  departments,
  roles,
  isEdit,
  currentUserCompanyId,
}) {
  const isSuperAdmin = String(userRole || "").trim().toLowerCase() === "super admin";
  const isCompanyFixed = !isSuperAdmin && Boolean(currentUserCompanyId);

  const visibleRoles = roles.filter(
    (role) => role.status === "Active" && (!isSuperAdmin ? role.roleName !== "Super Admin" : true)
  );

  const visibleDepartments = useMemo(() => {
    if (!formData.companyId) return [];
    return departments.filter((d) => String(d.companyId) === String(formData.companyId));
  }, [departments, formData.companyId]);

  useEffect(() => {
    if (isCompanyFixed && !isEdit) {
      setFormData((prev) => ({ ...prev, companyId: currentUserCompanyId || "" }));
    }
  }, [isCompanyFixed, isEdit, currentUserCompanyId, setFormData]);

  useEffect(() => {
    if (!formData.companyId) return;
    const stillValid = visibleDepartments.some(
      (d) => String(d.departmentId) === String(formData.departmentId || "")
    );
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, departmentId: "" }));
    }
  }, [formData.companyId, formData.departmentId, setFormData, visibleDepartments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">User Number</label>
        <input
          type="text"
          name="userNumber"
          value={formData.userNumber}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter user number"
          disabled={isEdit}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
        <input
          type="text"
          name="userName"
          value={formData.userName}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter user name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          name="userMail"
          value={formData.userMail}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter email"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isEdit ? "Leave empty to keep current password" : "Enter password"}
          required={!isEdit}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select
          name="roleId"
          value={formData.roleId}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          required
        >
          <option value="">Select Role</option>
          {visibleRoles.map((role) => (
            <option key={role.roleId} value={role.roleId}>
              {role.roleName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
        <select
          name="companyId"
          value={formData.companyId}
          onChange={handleChange}
          disabled={isCompanyFixed}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
          required
        >
          <option value="">Select Company</option>
          {companies.map((c) => (
            <option key={c.companyId} value={c.companyId}>
              {c.companyName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <select
          name="departmentId"
          value={formData.departmentId}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          required
        >
          <option value="">Select Department</option>
          {visibleDepartments.map((d) => (
            <option key={d.departmentId} value={d.departmentId}>
              {d.departmentName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {isEdit ? "Update User" : "Save User"}
        </button>
      </div>
    </form>
  );
}

export default function AddUser({ selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const [allDepartments, setAllDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    userName: "",
    userNumber: "",
    userMail: "",
    roleId: "",
    companyId: selectedCompanyId || "",
    departmentId: "",
    password: "",
  });
  const fileInputRef = useRef(null);

  const currentUserRole = user?.role || "";
  const currentUserId = user?.userId ?? user?.id ?? "system";
  const isSuperAdmin = String(currentUserRole).trim().toLowerCase() === "super admin";
  const currentUserCompanyId = user?.companyId || user?.company?.companyId || selectedCompanyId || "";

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [companyRes, roleRes, userRes, deptRes] = await Promise.all([
          API.get("/companies"),
          API.get("/roles"),
          API.get("/users", { params: selectedCompanyId ? { companyId: selectedCompanyId } : {} }),
          API.get("/departments"),
        ]);

        setCompanies(companyRes.data || []);
        setRoles(roleRes.data || []);
        setUsers(userRes.data || []);
        setAllDepartments(deptRes.data || []);
      } catch (err) {
        console.error("Error fetching data:", err.response?.data || err.message);
        toast.error("Error fetching users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCompanyId, refreshFlag]);

  const getCompanyAcronym = (id) => {
    const company = companies.find((c) => String(c.companyId) === String(id));
    return company?.companyAcr || "";
  };

  const getDepartmentName = (id) => {
    const dept = allDepartments.find((d) => String(d.departmentId) === String(id));
    return dept?.departmentName || "";
  };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(u.userNumber || "").toLowerCase().includes(q) ||
      String(u.userMail || "").toLowerCase().includes(q) ||
      String(u.userName || "").toLowerCase().includes(q)
    );
  });

  const openAddUserForm = () => {
    setFormData({
      userId: "",
      userName: "",
      userNumber: "",
      userMail: "",
      roleId: "",
      companyId: !isSuperAdmin ? currentUserCompanyId : selectedCompanyId || "",
      departmentId: "",
      password: "",
    });
    setIsEdit(false);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.departmentId) {
      toast.error("Please select a department");
      return;
    }

    const payload = {
      ...formData,
      createdBy: currentUserId,
      updatedBy: currentUserId,
      companyId: !isSuperAdmin
        ? currentUserCompanyId || formData.companyId
        : formData.companyId || selectedCompanyId || "",
      departmentId: formData.departmentId,
      status: "Active",
    };

    try {
      if (isEdit) {
        await API.put(`/users/${formData.userId}`, payload);
      } else {
        await API.post("/users", payload);
      }

      Swal.fire("Success", `User ${isEdit ? "updated" : "added"} successfully`, "success");
      setShowForm(false);
      setRefreshFlag((prev) => !prev);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Operation failed";
      Swal.fire("Error", msg, "error");
    }
  };

  const parseCsvLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values.map((v) => v.replace(/^"(.*)"$/, "$1").trim());
  };

  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return headers.reduce((acc, key, idx) => {
        acc[key] = values[idx] ?? "";
        return acc;
      }, {});
    });
  };

  const resolveCompanyId = (row, mapByName, mapByAcr) => {
    if (!isSuperAdmin) {
      return String(currentUserCompanyId || selectedCompanyId || "").trim();
    }
    if (selectedCompanyId) return String(selectedCompanyId);
    const raw = String(row.companyId || "").trim();
    if (raw) return raw;
    return (
      mapByName.get(String(row.companyName || "").trim().toLowerCase()) ||
      mapByAcr.get(String(row.companyAcr || "").trim().toLowerCase()) ||
      ""
    );
  };

  const resolveDepartmentId = (row, companyId, deptByName, deptByAcr) => {
    const rawDepartmentId = String(row.departmentId || "").trim();
    if (rawDepartmentId) return rawDepartmentId;
    const nameKey = `${companyId}::${String(row.departmentName || "").trim().toLowerCase()}`;
    const acrKey = `${companyId}::${String(row.departmentAcr || "").trim().toLowerCase()}`;
    return String(deptByName.get(nameKey) || deptByAcr.get(acrKey) || "").trim();
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const roleIdByName = new Map(
        roles.map((r) => [String(r.roleName || "").trim().toLowerCase(), String(r.roleId)])
      );
      const companyIdByName = new Map(
        companies.map((c) => [String(c.companyName || "").trim().toLowerCase(), String(c.companyId)])
      );
      const companyIdByAcr = new Map(
        companies.map((c) => [String(c.companyAcr || "").trim().toLowerCase(), String(c.companyId)])
      );
      const departmentIdByName = new Map(
        allDepartments.map((d) => [
          `${String(d.companyId)}::${String(d.departmentName || "").trim().toLowerCase()}`,
          String(d.departmentId),
        ])
      );
      const departmentIdByAcr = new Map(
        allDepartments.map((d) => [
          `${String(d.companyId)}::${String(d.departmentAcr || d.departmentAckr || "").trim().toLowerCase()}`,
          String(d.departmentId),
        ])
      );

      const payloads = rows
        .map((row) => {
          const companyId = resolveCompanyId(row, companyIdByName, companyIdByAcr);
          const roleId =
            String(row.roleId || "").trim() ||
            roleIdByName.get(String(row.roleName || "").trim().toLowerCase()) ||
            "";
          const departmentId = resolveDepartmentId(row, companyId, departmentIdByName, departmentIdByAcr);

          return {
            userNumber: String(row.userNumber || "").trim(),
            userName: String(row.userName || "").trim() || null,
            userMail: String(row.userMail || "").trim(),
            password: String(row.password || "").trim(),
            roleId,
            companyId,
            departmentId,
            status: "Active",
            createdBy: currentUserId,
            updatedBy: currentUserId,
          };
        })
        .filter(
          (p) =>
            p.userNumber &&
            p.userMail &&
            p.password &&
            String(p.roleId || "").trim() &&
            String(p.companyId || "").trim() &&
            String(p.departmentId || "").trim()
        );

      if (payloads.length === 0) {
        toast.error("CSV must include valid company/department/role mappings");
        return;
      }

      const results = await Promise.allSettled(payloads.map((payload) => API.post("/users", payload)));
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) setRefreshFlag((prev) => !prev);
      if (failCount === 0) {
        Swal.fire("Uploaded", `${successCount} users uploaded successfully`, "success");
      } else {
        Swal.fire("Completed", `${successCount} uploaded, ${failCount} failed`, "warning");
      }
    } catch (err) {
      console.error("User bulk upload failed:", err);
      toast.error("Bulk upload failed");
    }
  };

  const csvValue = (value) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const downloadSampleTemplate = () => {
    const baseHeaders = [
      "userNumber",
      "userName",
      "userMail",
      "password",
      "roleName",
      "departmentName",
      "departmentAcr",
    ];
    const headers = isSuperAdmin
      ? [
          "userNumber",
          "userName",
          "userMail",
          "password",
          "roleName",
          "companyName",
          "companyAcr",
          "departmentName",
          "departmentAcr",
        ]
      : baseHeaders;

    const sampleCompanyName = selectedCompanyName || "Acme Private Limited";
    const sampleCompanyAcr = "APL";
    const superAdminRows = [
      ["USR1001", "John Doe", "john.doe@acme.com", "Pass@123", "Admin", sampleCompanyName, sampleCompanyAcr, "Human Resources", "HR"],
      ["USR1002", "Jane Smith", "jane.smith@acme.com", "Pass@123", "Student", sampleCompanyName, sampleCompanyAcr, "Finance", "FIN"],
    ];
    const adminRows = [
      ["USR1001", "John Doe", "john.doe@acme.com", "Pass@123", "Admin", "Human Resources", "HR"],
      ["USR1002", "Jane Smith", "jane.smith@acme.com", "Pass@123", "Student", "Finance", "FIN"],
    ];

    const csv = [
      headers.join(","),
      ...(isSuperAdmin ? superAdminRows : adminRows).map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user_bulk_upload_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={openAddUserForm}
        placeholder="Search user..."
        buttonText="Add User"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleBulkUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
            >
              Upload CSV
            </button>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
            >
              Download Sample
            </button>
          </>
        }
      />

      <MasterTable
        columns={["User Number", "User Name", "Email", "Role", ...(!selectedCompanyId ? ["Company"] : []), "Department", "Actions"]}
        loading={isLoading}
      >
        {filteredUsers.map((u) => (
          <tr key={u.userId || u.userNumber} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{u.userNumber}</td>
            <td className="py-3 px-4">{u.userName || "-"}</td>
            <td className="py-3 px-4">{u.userMail}</td>
            <td className="py-3 px-4">{u.role?.roleName || u.roleId}</td>
            {!selectedCompanyId && <td className="py-3 px-4">{getCompanyAcronym(u.companyId)}</td>}
            <td className="py-3 px-4">{getDepartmentName(u.departmentId)}</td>
            <td className="py-3 px-4">
              <ActionButtons
                onEdit={() => {
                  setFormData({
                    userId: u.userId,
                    userName: u.userName || "",
                    userNumber: u.userNumber || "",
                    userMail: u.userMail || "",
                    roleId: String(u.roleId || ""),
                    companyId: String(u.companyId || ""),
                    departmentId: String(u.departmentId || ""),
                    password: "",
                  });
                  setIsEdit(true);
                  setShowForm(true);
                }}
                onDelete={() => {
                  Swal.fire({
                    title: "Are you sure?",
                    text: "You won't be able to revert this!",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Yes, delete it!",
                  }).then(async (result) => {
                    if (!result.isConfirmed) return;
                    try {
                      await API.delete(`/users/${u.userId}`, {
                        data: { updatedBy: currentUserId },
                      });
                      Swal.fire("Deleted!", "User has been deleted.", "success");
                      setRefreshFlag((prev) => !prev);
                    } catch (err) {
                      const msg = err.response?.data?.error || "Failed to delete user";
                      Swal.fire("Error!", msg, "error");
                    }
                  });
                }}
              />
            </td>
          </tr>
        ))}
        {!isLoading && filteredUsers.length === 0 && (
          <tr>
            <td
              colSpan={selectedCompanyId ? 7 : 8}
              className="text-center py-6 text-gray-500"
            >
              No users found
            </td>
          </tr>
        )}
      </MasterTable>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setIsEdit(false);
        }}
        title={isEdit ? "Edit User" : "Add New User"}
        icon={Cpu}
      >
        <UserForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setIsEdit(false);
          }}
          userRole={currentUserRole}
          companies={companies}
          departments={allDepartments}
          roles={roles}
          isEdit={isEdit}
          currentUserCompanyId={currentUserCompanyId}
        />
      </Modal>
    </div>
  );
}
