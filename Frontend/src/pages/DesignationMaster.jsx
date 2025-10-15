import React, { useState, useEffect } from "react";
import axios from "axios";
import { GraduationCap, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2';
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";

function AddOrEdit({ onSave, onCancel, editData, userRole, selectedCompanyId, selectedCompanyName }) {
  const { t } = useTranslation();
  const [designationName, setDesignationName] = useState(editData?.designationName || "");
  const [designationAckr, setDesignationAckr] = useState(editData?.designationAckr || "");
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
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
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
    if (!designationName || !designationAckr) return toast.error(t("pleaseFillAllFields"));
    if (userRole === "Super Admin" && !companyId) return toast.error(t("selectCompany"));

    const designationData = {
      designationName,
      designationAckr: designationAckr ? designationAckr.toUpperCase() : "",
      status,
      companyId,
      createdBy: editData ? editData.createdBy : userNumber,
      updatedBy: userNumber,
    };
    onSave(designationData, editData?.designationId);
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
            <GraduationCap className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? t("editDesignation") : t("addNewDesignation")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("designationName")}</label>
            <input
              type="text"
              value={designationName}
              onChange={(e) => setDesignationName(e.target.value)}
              placeholder={t("designationName")}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">{t("acronym")}</label>
            <input
              type="text"
              value={designationAckr}
              onChange={(e) => setDesignationAckr(e.target.value)}
              placeholder={t("acronym")}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
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

function DesignationMaster({userRole, selectedCompanyId, selectedCompanyName }) {
  const { t } = useTranslation();
  const [designations, setDesignations] = useState([]);
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

  const fetchDesignations = async () => {
    try {
      let url = "http://localhost:5000/api/designations";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      let data = res.data || [];
      if (selectedCompanyId && Array.isArray(data)) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setDesignations(data);
    } catch (err) {
      console.error("Error fetching designations:", err);
      toast.error(t("errorFetchingData"));
    }
  };

  useEffect(() => {
    fetchDesignations();
  },[selectedCompanyId, t]);

  const getCompanyAcronym = (id) => {
    const company = companies.find(c => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  const filteredData = designations.filter(
    (d) =>
      d.designationName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.designationAckr?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.status?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (designationData, designationId) => {
    try {
      if (designationId) {
        await axios.put(
          `http://localhost:5000/api/designations/${designationId}`,
          { ...designationData, updatedBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/designations",
          { ...designationData, createdBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      await fetchDesignations();
      setShowForm(false);
      setEditData(null);
      Swal.fire({
        icon: "success",
        title: designationId ? t("designationUpdated") : t("designationAdded"),
        text: designationId ? t("designationUpdated") : t("designationAdded")
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: designationId ? t("designationUpdateFailed") : t("designationAddFailed"),
        text: err.response?.data || err.message,
      });
      setShowForm(false);
    }
  };

  const handleDelete = async (designationId) => {
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
          await axios.delete(`http://localhost:5000/api/designations/${designationId}`, {
            data: { updatedBy: userNumber },
            headers: { Authorization: `Bearer ${token}` },
          });

          Swal.fire(t("deleted"), t("designationDeleted"), "success");
          await fetchDesignations();
        } catch (err) {
          console.error("Error deleting designation:", err);
          Swal.fire(t("error"), t("failedToDeleteDesignation"), "error");
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col px-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder={t("searchDesignation")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => { setShowForm(true); setEditData(null); }}
        >
          <Plus size={18} /> {t("addNewDesignation")}
        </button>
      </div>
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1" style={{ maxHeight: "320px" }}>
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
              <tr key={d.designationId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{d.designationName}</td>
                <td className="py-2 px-4">{d.designationAckr}</td>
                {!selectedCompanyId && <td>{getCompanyAcronym(d.companyId)}</td>}
                <td className="py-2 px-4 flex gap-2">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md" onClick={() => handleEdit(d)}>
                    <Pencil size={16} />
                  </button>
                  <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md" onClick={() => handleDelete(d.designationId)}>
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  {t("noDesignationsFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <AddOrEdit
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

export default DesignationMaster;