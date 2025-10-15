import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Search, Plus, X, Trash, Pencil, Cpu } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

// 🔹 Modal Component
function AddOrEditUser({
  formData,
  setFormData,
  onSave,
  onCancel,
  departments,
  setDepartments,
  selectedCompanyName,
  selectedCompanyId,
  userRole,
  companies,
  autoGenerate,
  setAutoGenerate,
  handleAutoGenerate,
  isEdit,
}) {
  const { t } = useTranslation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "role") {
      if (value === "Admin" && userRole === "Super Admin") {
        setFormData({ ...formData, role: value, departmentId: 1, biometricNumber: "" });
        setAutoGenerate(false);
      } else if (value === "Super Admin") {
        setFormData({ ...formData, role: value, companyId: 1, departmentId: 1, biometricNumber: "" });
        setAutoGenerate(false);
      } else {
        setFormData({ ...formData, role: value, departmentId: "", biometricNumber: "" });
        setAutoGenerate(false);
      }
    } else if (name === "companyId") {
      setFormData({ ...formData, companyId: value, departmentId: "", biometricNumber: "" });
      setAutoGenerate(false);
    } else if (name === "departmentId") {
      setFormData({ ...formData, departmentId: value });
      setAutoGenerate(false);
    } else if (name === "biometricNumber") {
      const intValue = value === "" ? "" : parseInt(value, 10);
      setFormData({ ...formData, [name]: isNaN(intValue) ? "" : intValue.toString() });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      const companyIdToFetch = formData.companyId || selectedCompanyId;
      if (!companyIdToFetch) {
        setDepartments([]);
        return;
      }
      try {
        const res = await axios.get(
          `http://localhost:5000/api/departments?companyId=${companyIdToFetch}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Fetched departments:", res.data);
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Error fetching departments:", err.response?.data || err.message);
        toast.error(t("errorFetchingData"));
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, [formData.companyId, selectedCompanyId, setDepartments, t]);

  const showCompanyField = () => {
    if (userRole === "Super Admin") {
      if (formData.role === "Super Admin") return false;
      return true;
    }
    return false;
  };

  const showDepartmentField = () => {
    return formData.role === "Staff" || formData.role === "Department Admin";
  };

  const showBiometricNumberField = () => {
    return formData.role === "Staff";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X size={16} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-2">
            <Cpu className="text-blue-600" size={24} />
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-800 text-center mb-1">
          {isEdit ? t("editUser") : t("addNewUser")}
        </h2>

        <form onSubmit={onSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
            <input
              type="email"
              name="userMail"
              placeholder={t("email")}
              value={formData.userMail}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("password")}</label>
            <input
              type="password"
              name="password"
              placeholder={t("password")}
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required={!isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("role")}</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            >
              <option value="">{t("selectRole")}</option>
              {(() => {
                let availableRoles = ["Super Admin", "Admin", "Department Admin", "Staff"];
                if (userRole === "Admin") {
                  availableRoles = ["Admin", "Department Admin", "Staff"];
                }
                return availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ));
              })()}
            </select>
          </div>

          {showCompanyField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("company")}</label>
              <select
                name="companyId"
                value={formData.companyId || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">{t("selectCompany")}</option>
                {companies
                  .filter((c) => c.companyId !== 1)
                  .map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {showDepartmentField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("department")}</label>
              <select
                name="departmentId"
                value={formData.departmentId ?? ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              >
                <option value="">{t("selectDepartment")}</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.departmentAckr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showBiometricNumberField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("biometricNumber")}</label>
              <input
                type="text"
                name="biometricNumber"
                placeholder={t("biometricNumber")}
                value={formData.biometricNumber || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                pattern="[0-9]*"
                title="Please enter a valid integer"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("userNumber")}</label>
            <div className="flex items-center gap-2 py-1">
              <input
                type="text"
                name="userNumber"
                placeholder={t("userNumber")}
                value={formData.userNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                disabled={autoGenerate || isEdit}
                required
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) =>
                    handleAutoGenerate(e.target.checked, formData.departmentId)
                  }
                  disabled={isEdit}
                />
                {t("autoGenerate")}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded-md transition text-sm"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition text-sm"
            >
              {isEdit ? t("update") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 🔹 Main Component
export default function AddUser({ selectedCompanyId, selectedCompanyName }) {
  const { t } = useTranslation();
  const token = sessionStorage.getItem("token");
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [formData, setFormData] = useState({
    userNumber: "",
    userMail: "",
    role: "",
    departmentId: "",
    companyId: selectedCompanyId || "",
    password: "",
    biometricNumber: "",
  });
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getCompanyAcronym = (id) => {
    const company = companies.find((c) => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  const getDepartmentAcronym = (id) => {
    const dept = allDepartments.find((d) => d.departmentId === id);
    return dept ? dept.departmentAckr : "";
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const companyRes = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(companyRes.data);

        let deptRes;
        if (selectedCompanyId) {
          deptRes = await axios.get(
            `http://localhost:5000/api/departments?companyId=${selectedCompanyId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          deptRes = await axios.get("http://localhost:5000/api/departments", {
            headers: { Authorization: `Bearer ${token}` } }
          );
        }
        console.log("Initial departments:", deptRes.data);
        setDepartments(deptRes.data);

        let url = "http://localhost:5000/api/users";
        if (selectedCompanyId) {
          url += `?companyId=${selectedCompanyId}`;
        }
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);

        const allDept = await axios.get("http://localhost:5000/api/departments", {
          headers: { Authorization: `Bearer ${token}` } }
        );
        setAllDepartments(allDept.data);
      } catch (err) {
        console.error("Error fetching data:", err.response?.data || err.message);
        toast.error(t("errorFetchingData"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCompanyId, token, refreshFlag, t]);

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUserRole(decoded.role);
    }
  }, [token]);

  const openAddUserForm = () => {
    setFormData({
      userNumber: "",
      userMail: "",
      role: "",
      departmentId: "",
      companyId: selectedCompanyId || (currentUserRole === "Super Admin" ? "" : 1),
      password: "",
      biometricNumber: "",
    });
    setAutoGenerate(false);
    setIsEdit(false);
    setShowForm(true);
  };

  const handleAutoGenerate = async (checked, departmentId) => {
    setAutoGenerate(checked);
    if (!checked) return setFormData((prev) => ({ ...prev, userNumber: "" }));

    try {
      const companyIdToUse = formData.companyId || selectedCompanyId || 1;
      const departmentIdToUse = departmentId || 1;
      const res = await axios.post(
        `http://localhost:5000/api/users/lastEmpNumber/${departmentIdToUse}`,
        {
          role: formData.role,
          companyId: companyIdToUse,
          departmentId: departmentIdToUse,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData((prev) => ({ ...prev, userNumber: res.data.lastEmpNumber }));
    } catch (err) {
      console.error("Error generating userNumber:", err.response?.data || err.message);
      toast.error(t("errorFetchingData"));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      createdBy: userNumber,
      updatedBy: userNumber,
      companyId: formData.companyId || selectedCompanyId || 1,
      departmentId: formData.departmentId || 1,
    };

    try {
      if (isEdit) {
        await axios.put(
          `http://localhost:5000/api/users/${formData.userNumber}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post("http://localhost:5000/api/users", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      Swal.fire({
        icon: "success",
        title: isEdit ? t("updated") : t("added"),
        text: t(isEdit ? "userUpdated" : "userAdded", { userNumber: formData.userNumber }),
      });
      setShowForm(false);
      setRefreshFlag((prev) => !prev);
    } catch (err) {
      console.error("Error saving user:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: isEdit ? t("updateFailed") : t("addFailed"),
        text: t(isEdit ? "userUpdateFailed" : "userAddFailed"),
      });
      setShowForm(false);
    }
  };

  return (
    <div className="h-full flex flex-col px-6">
      {isLoading && <div>{t("loading")}</div>}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder={t("searchUser")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          onClick={openAddUserForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
        >
          <Plus size={18} /> {t("addUser")}
        </button>
      </div>

      <div
        className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1"
        style={{ maxHeight: "320px" }}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">{t("userNumber")}</th>
              <th className="py-3 px-4">{t("email")}</th>
              <th className="py-3 px-4">{t("role")}</th>
              {!selectedCompanyId && <th className="py-3 px-4">{t("company")}</th>}
              <th className="py-3 px-4">{t("department")}</th>
              <th className="py-3 px-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(
                (u) =>
                  u.userNumber.toLowerCase().includes(search.toLowerCase()) ||
                  u.userMail.toLowerCase().includes(search.toLowerCase())
              )
              .map((u) => (
                <tr key={u.userNumber} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{u.userNumber}</td>
                  <td className="py-2 px-4">{u.userMail}</td>
                  <td className="py-2 px-4">{u.role}</td>
                  {!selectedCompanyId && (
                    <td className="py-2 px-4">{getCompanyAcronym(u.companyId)}</td>
                  )}
                  <td className="py-2 px-4">{getDepartmentAcronym(u.departmentId)}</td>
                  <td className="py-2 px-4 flex gap-2">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                      onClick={() => {
                        setFormData(u);
                        setAutoGenerate(false);
                        setShowForm(true);
                        setIsEdit(true);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                      onClick={() => {
                        Swal.fire({
                          title: t("areYouSure"),
                          text: t("cannotRevert"),
                          icon: "warning",
                          showCancelButton: true,
                          confirmButtonColor: "#3085d6",
                          cancelButtonColor: "#d33",
                          confirmButtonText: t("confirmDelete"),
                          cancelButtonText: t("cancel")
                        }).then(async (result) => {
                          if (result.isConfirmed) {
                            try {
                              await axios.delete(
                                `http://localhost:5000/api/users/${u.userNumber}`,
                                {
                                  data: { updatedBy: userNumber },
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );
                              Swal.fire({
                                title: t("deleted"),
                                text: t("userDeleted"),
                                icon: "success",
                              });
                              setRefreshFlag((prev) => !prev);
                            } catch (err) {
                              console.error("Delete error:", err.response?.data || err.message);
                              Swal.fire({
                                title: t("error"),
                                text: t("failedToDeleteUser"),
                                icon: "error",
                              });
                            }
                          }
                        });
                      }}
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            {users.filter(
              (u) =>
                u.userNumber.toLowerCase().includes(search.toLowerCase()) ||
                u.userMail.toLowerCase().includes(search.toLowerCase())
            ).length === 0 && (
              <tr>
                <td
                  colSpan={selectedCompanyId ? 5 : 6}
                  className="text-center py-4 text-gray-500"
                >
                  {t("noUsersFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddOrEditUser
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          departments={departments}
          setDepartments={setDepartments}
          selectedCompanyName={selectedCompanyName}
          selectedCompanyId={selectedCompanyId}
          userRole={currentUserRole}
          companies={companies}
          autoGenerate={autoGenerate}
          setAutoGenerate={setAutoGenerate}
          handleAutoGenerate={handleAutoGenerate}
          isEdit={isEdit}
        />
      )}
    </div>
  );
}