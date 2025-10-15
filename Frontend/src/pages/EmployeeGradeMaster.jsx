import React, { useState, useEffect } from "react";
import axios from "axios";
import { Award, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2';
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";

function AddOrEditGrade({ onSave, onCancel, editData, userRole, selectedCompanyId, selectedCompanyName }) {
  const { t } = useTranslation();
  const [employeeGradeName, setEmployeeGradeName] = useState(editData?.employeeGradeName || "");
  const [employeeGradeAckr, setEmployeeGradeAckr] = useState(editData?.employeeGradeAckr || "");
  const [status, setStatus] = useState(editData?.status || "active");
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(editData?.companyId || selectedCompanyId || "");
  const [companyName, setCompanyName] = useState(editData?.companyName || selectedCompanyName || "");

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setCompanies(res.data || []);
        if (userRole === "Super Admin" && selectedCompanyId) {
          setCompanyId(selectedCompanyId);
          const selected = res.data.find(c => c.companyId === selectedCompanyId);
          setCompanyName(selected ? selected.companyName : selectedCompanyName || "");
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
        toast.error(t("errorFetchingData"));
      }
    };
    if (userRole === "Super Admin") fetchCompanies();
    else if (userRole === "Admin" && selectedCompanyId) {
      setCompanyId(selectedCompanyId);
      setCompanyName(selectedCompanyName || t("noCompanySelected"));
    }
    return () => { mounted = false; };
  }, [userRole, selectedCompanyId, selectedCompanyName, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeGradeName || !employeeGradeAckr) return toast.error(t("pleaseFillAllFields"));
    if (userRole === "Super Admin" && !companyId) return toast.error(t("selectCompany"));

    const gradeData = {
      employeeGradeName,
      employeeGradeAckr: employeeGradeAckr.toUpperCase(),
      status,
      companyId,
      createdBy: editData ? editData.createdBy : userNumber,
      updatedBy: userNumber,
    };
    onSave(gradeData, editData?.employeeGradeId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={22} />
        </button>
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Award className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? t("editGrade") : t("addNewGrade")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("gradeName")}</label>
            <input
              type="text"
              value={employeeGradeName}
              onChange={(e) => setEmployeeGradeName(e.target.value)}
              placeholder={t("gradeName")}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("acronym")}</label>
            <input
              type="text"
              value={employeeGradeAckr}
              onChange={(e) => setEmployeeGradeAckr(e.target.value)}
              placeholder={t("acronym")}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("status")}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("company")}</label>
            {userRole === "Super Admin" ? (
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  const selected = companies.find((c) => c.companyId === e.target.value);
                  setCompanyName(selected ? selected.companyName : "");
                }}
                disabled={editData}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">{t("selectCompany")}</option>
                {companies
                  .filter(c => c.companyId !== 1)
                  .map(c => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={companyName || t("noCompanySelected")}
                disabled
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 cursor-not-allowed"
              />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition"
            >
              {editData ? t("update") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeGradeMaster({userRole, selectedCompanyId, selectedCompanyName }) {
  const { t } = useTranslation();
  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
        toast.error(t("errorFetchingData"));
      }
    };
    fetchCompanies();
  }, [t]);

  const fetchGrades = async () => {
    try {
      let url = "http://localhost:5000/api/employeeGrades";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      let data = res.data || [];
      if (selectedCompanyId && Array.isArray(data)) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setGrades(data);
    } catch (err) {
      console.error("Error fetching grades:", err);
      toast.error(t("errorFetchingData"));
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [selectedCompanyId, t]);

  const getCompanyAcronym = (id) => {
    const company = companies.find(c => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  const filteredData = grades.filter(
    (d) =>
      d.employeeGradeName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.employeeGradeAckr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (gradeData, gradeId) => {
    try {
      if (gradeId) {
        await axios.put(
          `http://localhost:5000/api/employeeGrades/${gradeId}`,
          { ...gradeData, updatedBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/employeeGrades",
          { ...gradeData, createdBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      await fetchGrades();
      setShowForm(false);
      setEditData(null);
      Swal.fire({
        icon: "success",
        title: gradeId ? t("gradeUpdated") : t("gradeAdded"),
        text: gradeId ? t("gradeUpdated") : t("gradeAdded"),
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: gradeId ? t("gradeUpdateFailed") : t("gradeAddFailed"),
        text: err.response?.data || err.message,
      });
      setShowForm(false);
    }
  };

  const handleEdit = async (grade) => {
    try {
      const res = await axios.get("http://localhost:5000/api/companies", { headers: { Authorization: `Bearer ${token}` } });
      const company = res.data.find((c) => c.companyId === grade.companyId);
      setEditData({ ...grade, companyName: company ? company.companyName : selectedCompanyName || "" });
      setShowForm(true);
    } catch (err) {
      console.error("Error fetching company for edit:", err);
      setEditData({ ...grade, companyName: selectedCompanyName || "" });
      setShowForm(true);
    }
  };

  const handleDelete = async (employeeGradeId) => {
    Swal.fire({
      title: t("areYouSure"),
      text: t("cannotRevert"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("confirmDelete")
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/api/employeeGrades/${employeeGradeId}`, {
            data: { updatedBy: userNumber },
            headers: { Authorization: `Bearer ${token}` },
          });

          Swal.fire(t("deleted"), t("gradeDeleted"), "success");
          await fetchGrades();
        } catch (err) {
          console.error("Error deleting employee Grade:", err);
          Swal.fire(t("error"), t("failedToDeleteGrade"), "error");
        }
      }
    });
  };

  return (
    <div className="h-full flex-1 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder={t("searchGrade")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => { setShowForm(true); setEditData(null); }}
        >
          <Plus size={18} /> {t("addNewGrade")}
        </button>
      </div>

      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">{t("name")}</th>
              <th className="py-3 px-4">{t("acronym")}</th>
              {!selectedCompanyId && <th className="py-3 px-4">{t("company")}</th>}
              <th className="py-3 px-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d) => (
              <tr key={d.employeeGradeId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{d.employeeGradeName}</td>
                <td className="py-2 px-4">{d.employeeGradeAckr}</td>
                {!selectedCompanyId && <td>{getCompanyAcronym(d.companyId)}</td>}
                <td className="py-2 px-4 flex gap-2">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md" onClick={() => handleEdit(d)}>
                    <Pencil size={16} />
                  </button>
                  <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md" onClick={() => handleDelete(d.employeeGradeId)}>
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={selectedCompanyId ? 3 : 4} className="text-center py-4 text-gray-500">
                  {t("noGradesFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddOrEditGrade
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditData(null); }}
          editData={editData}
          userRole={userRole}
          selectedCompanyId={selectedCompanyId}
          selectedCompanyName={selectedCompanyName}
        />
      )}
    </div>
  );
}

export default EmployeeGradeMaster;