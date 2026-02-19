import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

import Modal from "../components/ui/Modal";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";
import ActionButtons from "../components/common/ActionButton";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();

const defaultPlanForm = {
  planName: "",
  companyId: "",
};

const defaultHolidayForm = {
  holidayDate: "",
  description: "",
  companyId: "",
};

export default function HolidayPlanMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? "system";

  const [plans, setPlans] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [holidaySearch, setHolidaySearch] = useState("");
  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || "");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [editHoliday, setEditHoliday] = useState(null);
  const [planForm, setPlanForm] = useState(defaultPlanForm);
  const [holidayForm, setHolidayForm] = useState(defaultHolidayForm);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  const effectiveCompanyId = isSuperAdmin
    ? (companyScope || selectedCompanyId || "")
    : (selectedCompanyId || user?.companyId || user?.company?.companyId || "");

  const selectedPlan = useMemo(
    () => plans.find((p) => String(p.holidayPlanId) === String(selectedPlanId)) || null,
    [plans, selectedPlanId]
  );

  const getCompanyName = (companyId) => {
    const company = companies.find((c) => String(c.companyId) === String(companyId));
    return company?.companyName || selectedCompanyName || String(companyId || "");
  };

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await API.get("/companies");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get("/holidayPlans", { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setPlans(data);
      if (selectedPlanId && !data.some((p) => String(p.holidayPlanId) === String(selectedPlanId))) {
        setSelectedPlanId("");
        setHolidays([]);
      }
    } catch (err) {
      console.error("Error fetching holiday plans:", err);
      toast.error("Could not load holiday plans");
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchHolidays = async (planId) => {
    if (!planId) {
      setHolidays([]);
      return;
    }
    try {
      setLoadingHolidays(true);
      const params = {
        holidayPlanId: planId,
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
      };
      const res = await API.get("/holidays", { params });
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching holidays:", err);
      toast.error("Could not load holidays");
      setHolidays([]);
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    setCompanyScope(selectedCompanyId || user?.companyId || "");
  }, [selectedCompanyId, user?.companyId]);

  useEffect(() => {
    fetchPlans();
  }, [effectiveCompanyId]);

  useEffect(() => {
    fetchHolidays(selectedPlanId);
  }, [selectedPlanId, effectiveCompanyId]);

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) =>
      [p.holidayPlanName, p.startDate, p.endDate, getCompanyName(p.companyId)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [plans, search, companies]);

  const filteredHolidays = useMemo(() => {
    const q = holidaySearch.trim().toLowerCase();
    if (!q) return holidays;
    return holidays.filter((h) =>
      [h.holidayDate, h.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [holidays, holidaySearch]);

  const resetPlanForm = () => {
    setPlanForm({
      ...defaultPlanForm,
      companyId: effectiveCompanyId || "",
    });
    setEditPlan(null);
  };

  const resetHolidayForm = () => {
    setHolidayForm({
      ...defaultHolidayForm,
      companyId: selectedPlan?.companyId || effectiveCompanyId || "",
    });
    setEditHoliday(null);
  };

  const openAddPlan = () => {
    resetPlanForm();
    setShowPlanForm(true);
  };

  const openEditPlan = (row) => {
    setEditPlan(row);

    setPlanForm({
      planName: row.holidayPlanName || "",
      companyId: row.companyId || effectiveCompanyId || "",
    });
    setShowPlanForm(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();

    const companyId = isSuperAdmin ? (planForm.companyId || effectiveCompanyId) : effectiveCompanyId;
    const planName = String(planForm.planName || "").trim();

    if (!companyId) {
      toast.error("Select a company");
      return;
    }
    if (!planName) {
      toast.error("Enter plan name");
      return;
    }
    const basePayload = {
      holidayPlanName: planName,
      companyId,
      updatedBy: currentUserId,
    };
    const payload = editPlan ? basePayload : { ...basePayload, createdBy: currentUserId };

    try {
      if (editPlan?.holidayPlanId) {
        await API.put(`/holidayPlans/${editPlan.holidayPlanId}`, payload);
        Swal.fire("Updated!", "Holiday plan updated successfully.", "success");
      } else {
        await API.post("/holidayPlans", payload);
        Swal.fire("Added!", "Holiday plan created successfully.", "success");
      }
      setShowPlanForm(false);
      resetPlanForm();
      fetchPlans();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDeletePlan = (holidayPlanId) => {
    Swal.fire({
      title: "Delete holiday plan?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await API.delete(`/holidayPlans/${holidayPlanId}`, {
          data: { updatedBy: currentUserId },
        });
        Swal.fire("Deleted!", "Holiday plan deleted.", "success");
        if (String(selectedPlanId) === String(holidayPlanId)) {
          setSelectedPlanId("");
          setHolidays([]);
        }
        fetchPlans();
      } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || "Delete failed";
        Swal.fire("Error", String(msg), "error");
      }
    });
  };

  const openAddHoliday = () => {
    if (!selectedPlan) {
      toast.error("Select a holiday plan first");
      return;
    }
    resetHolidayForm();
    setShowHolidayForm(true);
  };

  const openEditHoliday = (row) => {
    setEditHoliday(row);
    setHolidayForm({
      holidayDate: row.holidayDate || "",
      description: row.description || "",
      companyId: row.companyId || selectedPlan?.companyId || effectiveCompanyId || "",
    });
    setShowHolidayForm(true);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast.error("Select a holiday plan first");
      return;
    }
    if (!holidayForm.holidayDate || !holidayForm.description.trim()) {
      toast.error("Holiday date and description are required");
      return;
    }

    const basePayload = {
      holidayPlanId: selectedPlan.holidayPlanId,
      holidayDate: holidayForm.holidayDate,
      description: holidayForm.description.trim(),
      companyId: holidayForm.companyId || selectedPlan.companyId || effectiveCompanyId,
      updatedBy: currentUserId,
    };
    const payload = editHoliday ? basePayload : { ...basePayload, createdBy: currentUserId };

    try {
      if (editHoliday?.holidayId) {
        await API.put(`/holidays/${editHoliday.holidayId}`, payload);
        Swal.fire("Updated!", "Holiday updated successfully.", "success");
      } else {
        await API.post("/holidays", payload);
        Swal.fire("Added!", "Holiday added successfully.", "success");
      }
      setShowHolidayForm(false);
      resetHolidayForm();
      fetchHolidays(selectedPlan.holidayPlanId);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Operation failed";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleDeleteHoliday = (holidayId) => {
    Swal.fire({
      title: "Delete holiday?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await API.delete(`/holidays/${holidayId}`, {
          data: {
            updatedBy: currentUserId,
            companyId: selectedPlan?.companyId || effectiveCompanyId,
          },
        });
        Swal.fire("Deleted!", "Holiday deleted.", "success");
        fetchHolidays(selectedPlanId);
      } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || "Delete failed";
        Swal.fire("Error", String(msg), "error");
      }
    });
  };

  return (
    <div className="h-full flex flex-col px-6 gap-5">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={openAddPlan}
        placeholder="Search holiday plan..."
        buttonText="Add Holiday Plan"
        actions={
          isSuperAdmin ? (
            <select
              value={companyScope}
              onChange={(e) => setCompanyScope(e.target.value)}
              className="h-10 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">All companies</option>
              {companies.map((company) => (
                <option key={company.companyId} value={company.companyId}>
                  {company.companyName}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      <MasterTable
        columns={["Plan Name", "Start Date", "End Date", ...(isSuperAdmin ? ["Company"] : []), "Actions"]}
        loading={loadingPlans}
      >
        {filteredPlans.length === 0 ? (
          <tr>
            <td colSpan={isSuperAdmin ? 5 : 4} className="py-4 px-4 text-center text-gray-500">
              No holiday plans found
            </td>
          </tr>
        ) : (
          filteredPlans.map((row) => (
            <tr key={row.holidayPlanId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{row.holidayPlanName}</td>
              <td className="py-3 px-4">{row.startDate}</td>
              <td className="py-3 px-4">{row.endDate}</td>
              {isSuperAdmin && <td className="py-3 px-4">{getCompanyName(row.companyId)}</td>}
              <td className="py-3 px-4">
                <ActionButtons
                  onEdit={() => openEditPlan(row)}
                  onDelete={() => handleDeletePlan(row.holidayPlanId)}
                />
              </td>
            </tr>
          ))
        )}
      </MasterTable>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Holiday Plan</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="h-10 min-w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select plan</option>
              {plans.map((plan) => (
                <option key={plan.holidayPlanId} value={plan.holidayPlanId}>
                  {plan.holidayPlanName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={holidaySearch}
              onChange={(e) => setHolidaySearch(e.target.value)}
              placeholder="Search holidays..."
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={openAddHoliday}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg shadow-md whitespace-nowrap"
            >
              Add Holiday
            </button>
          </div>
        </div>

        <MasterTable columns={["Holiday Date", "Description", "Actions"]} loading={loadingHolidays}>
          {!selectedPlanId ? (
            <tr>
              <td colSpan={3} className="py-4 px-4 text-center text-gray-500">
                Select a holiday plan to view holidays
              </td>
            </tr>
          ) : filteredHolidays.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 px-4 text-center text-gray-500">
                No holidays found
              </td>
            </tr>
          ) : (
            filteredHolidays.map((row) => (
              <tr key={row.holidayId} className="border-t hover:bg-gray-50">
                <td className="py-3 px-4">{row.holidayDate}</td>
                <td className="py-3 px-4">{row.description}</td>
                <td className="py-3 px-4">
                  <ActionButtons
                    onEdit={() => openEditHoliday(row)}
                    onDelete={() => handleDeleteHoliday(row.holidayId)}
                  />
                </td>
              </tr>
            ))
          )}
        </MasterTable>
      </div>

      <Modal
        isOpen={showPlanForm}
        onClose={() => {
          setShowPlanForm(false);
          resetPlanForm();
        }}
        title={editPlan ? "Edit Holiday Plan" : "Add Holiday Plan"}
        icon={Calendar}
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <select
                value={planForm.companyId || ""}
                onChange={(e) => setPlanForm((p) => ({ ...p, companyId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
              <input
                type="text"
                value={planForm.planName}
                onChange={(e) => setPlanForm((p) => ({ ...p, planName: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Standard Calendar"
                required
              />
            </div>
            <div />
          </div>

          <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
            Start and end dates are auto-filled from the currently active leave period.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPlanForm(false);
                resetPlanForm();
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">
              {editPlan ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showHolidayForm}
        onClose={() => {
          setShowHolidayForm(false);
          resetHolidayForm();
        }}
        title={editHoliday ? "Edit Holiday" : "Add Holiday"}
        icon={Calendar}
      >
        <form onSubmit={handleSaveHoliday} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Date</label>
            <input
              type="date"
              value={holidayForm.holidayDate}
              onChange={(e) => setHolidayForm((p) => ({ ...p, holidayDate: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={holidayForm.description}
              onChange={(e) => setHolidayForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Independence Day"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
            <input
              type="text"
              value={getCompanyName(holidayForm.companyId || selectedPlan?.companyId || effectiveCompanyId)}
              readOnly
              className="w-full border rounded-lg px-3 py-2 bg-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowHolidayForm(false);
                resetHolidayForm();
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">
              {editHoliday ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
