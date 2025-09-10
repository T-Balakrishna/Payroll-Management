import React, { useState, useEffect } from "react";
import axios from "axios";

const HolidayPlans = () => {
  const [holidayPlans, setHolidayPlans] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const user = localStorage.getItem("adminName")
  const [planForm, setPlanForm] = useState({
    startYear: "",
    endYear: "",
    weeklyOff: [],
  });

  const [holidayForm, setHolidayForm] = useState({
    holidayDate: "",
    description: "",
  });

  const weekDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  useEffect(() => {
    fetchHolidayPlans();
  }, []);

  // Fetch all holiday plans
  const fetchHolidayPlans = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/holidayPlans");
      setHolidayPlans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching holiday plans:", err);
    }
  };

  // Fetch holidays of a specific plan
  const fetchHolidays = async (holidayPlanId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/holidays/${holidayPlanId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("Error fetching holidays:", err);
      return [];
    }
  };

  const toggleWeeklyOff = (day) => {
    setPlanForm((prev) => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day)
        ? prev.weeklyOff.filter((d) => d !== day)
        : [...prev.weeklyOff, day],
    }));
  };

  // Save or update Holiday Plan
  const handleSavePlan = async () => {
    const startYear = parseInt(planForm.startYear);
    const endYear = parseInt(planForm.endYear);

    if (isNaN(startYear) || isNaN(endYear)) {
      alert("Enter valid years.");
      return;
    }

    if (endYear !== startYear + 1) {
      alert("End year must be exactly 1 year greater than start year.");
      return;
    }

    if (planForm.weeklyOff.length === 0) {
      alert("There must be at least one WeeklyOff");
      return;
    }

    const holidayPlanName = `${startYear}-${endYear}`;
    const startDate = `${startYear}-06-01`;
    const endDate = `${endYear}-04-30`;

    try {
      let plan;
      if (selectedPlan) {
        // Update weeklyOffs
        await axios.put(`http://localhost:5000/api/holidayPlans/${selectedPlan.holidayPlanId}`, {
          holidayPlanName,
          startDate,
          endDate,
          weeklyOff: planForm.weeklyOff,
          updatedBy : user,
        });
        plan = selectedPlan;

        // Regenerate weeklyOff holidays in backend
        // await axios.post(`http://localhost:5000/api/holidays/regenerateWeeklyOffs/${selectedPlan.holidayPlanId}`);
      } else {
        // Create new plan
        const res = await axios.post("http://localhost:5000/api/holidayPlans", {
          holidayPlanName,
          startDate,
          endDate,
          weeklyOff: planForm.weeklyOff,
          createdBy : user,
        });
        plan = res.data;
      }

      setPlanModalOpen(false);
      setPlanForm({ startYear: "", endYear: "", weeklyOff: [] });
      setSelectedPlan(null);

      fetchHolidayPlans();
      fetchHolidays(plan.holidayPlanId).then(setHolidays);

    } catch (err) {
      alert("Error creating/updating holiday plan:", err)
      setPlanForm({ startYear: "", endYear: "", weeklyOff: [] });
      setPlanModalOpen(false);
      console.error("Error creating/updating holiday plan:", err);
    }
  };

  // Delete Holiday Plan
  const handleDeletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/holidayPlans/${id}`,{
        data: { updatedBy: user }
      });
      fetchHolidayPlans();
      if (selectedPlan?.holidayPlanId === id) {
        setSelectedPlan(null);
        setHolidays([]);
      }
    } catch (err) {
      console.error("Error deleting holiday plan:", err);
    }
  };

  // Save or update Holiday
  const handleSaveHoliday = async () => {
    if (!selectedPlan) return;

    const holidayDate = holidayForm.holidayDate;
    const description = holidayForm.description;

    try {
      await axios.post("http://localhost:5000/api/holidays", {
        holidayPlanId: selectedPlan.holidayPlanId,
        holidayDate,
        description,
      });

      setHolidayModalOpen(false);
      setHolidayForm({ holidayDate: "", description: "" });
      setSelectedHoliday(null);

      fetchHolidays(selectedPlan.holidayPlanId).then(setHolidays);
    } catch (err) {
      console.error("Error saving holiday:", err);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/holidays/${id}`, {
        data: { updatedBy: user }
      });
      fetchHolidays(selectedPlan.holidayPlanId).then(setHolidays);
    } catch (err) {
      console.error("Error deleting holiday:", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Holiday Plans</h1>

      <button
        onClick={() => {
          setSelectedPlan(null);
          setPlanForm({ startYear: "", endYear: "", weeklyOff: [] });
          setPlanModalOpen(true);
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Add Holiday Plan
      </button>

      {/* Holiday Plans Table */}
      <div className="overflow-y-auto max-h-64 border rounded mt-4">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">Plan Name</th>
              <th className="border px-4 py-2">Start Date</th>
              <th className="border px-4 py-2">End Date</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidayPlans.map((plan) => (
              <tr key={plan.holidayPlanId}>
                <td className="border px-4 py-2">{plan.holidayPlanName}</td>
                <td className="border px-4 py-2">{plan.startDate}</td>
                <td className="border px-4 py-2">{plan.endDate}</td>
                <td className="border px-4 py-2">
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                    onClick={() => {
                      setPlanForm({
                        startYear: parseInt(plan.startDate.slice(0, 4)),
                        endYear: parseInt(plan.endDate.slice(0, 4)),
                        weeklyOff: plan.weeklyOff || [],
                      });
                      setSelectedPlan(plan);
                      setPlanModalOpen(true);
                                          
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => handleDeletePlan(plan.holidayPlanId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Select Plan */}
      <div>
        <label className="font-semibold mr-2">Select Holiday Plan:</label>
        <select
          value={selectedPlan?.holidayPlanId || ""}
          onChange={(e) => {
            const plan = holidayPlans.find(
              (p) => p.holidayPlanId == e.target.value
            );
            setSelectedPlan(plan);
            if (!plan) {
              setHolidays([]);
              return;
            }
            fetchHolidays(plan.holidayPlanId).then(setHolidays);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value="">-- Select --</option>
          {holidayPlans.map((plan) => (
            <option key={plan.holidayPlanId} value={plan.holidayPlanId}>
              {plan.holidayPlanName}
            </option>
          ))}
        </select>
      </div>

      {/* Holidays of Selected Plan */}
      {selectedPlan && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">
              Holidays in {selectedPlan.holidayPlanName}
            </h2>
            <button
              onClick={() => {
                setHolidayForm({ holidayDate: "", description: "" });
                setSelectedHoliday(null);
                setHolidayModalOpen(true);
              }}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Add Holiday
            </button>
          </div>

          <div className="overflow-y-auto max-h-64 border rounded">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Date</th>
                  <th className="px-4 py-2 border">Description</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(holidays || []).map((h) => (
                  <tr key={h.holidayId}>
                    <td className="border px-4 py-2">{h.holidayDate}</td>
                    <td className="border px-4 py-2">{h.description}</td>
                    <td className="border px-4 py-2">
                      {String(h.holidayId).startsWith("wo-") ? (
                        <span className="text-gray-400">Weekly Off</span>
                      ) : (
                        <>
                          <button
                            className="bg-yellow-500 text-white px-2 py-1 rounded mr-1"
                            onClick={() => {
                              setHolidayForm({
                                holidayDate: h.holidayDate,
                                description: h.description,
                              });
                              setSelectedHoliday(h);
                              setHolidayModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="bg-red-500 text-white px-2 py-1 rounded"
                            onClick={() => handleDeleteHoliday(h.holidayId)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Holiday Plan Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded w-96">
            <h2 className="text-xl font-bold mb-4">
              {selectedPlan ? "Edit" : "Add"} Holiday Plan
            </h2>
            <input
              type="number"
              placeholder="Start Year"
              value={planForm.startYear}
              onChange={(e) =>
                setPlanForm({ ...planForm, startYear: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />
            <input
              type="number"
              placeholder="End Year"
              value={planForm.endYear}
              onChange={(e) =>
                setPlanForm({ ...planForm, endYear: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <div className="flex flex-wrap gap-4 mb-4">
              {weekDays.map((day) => (
                <label key={day} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={planForm.weeklyOff.includes(day)}
                    onChange={() => toggleWeeklyOff(day)}
                  />
                  {day}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPlanModalOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Holiday Modal */}
      {holidayModalOpen && selectedPlan && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded w-96">
            <h2 className="text-xl font-bold mb-4">
              {selectedHoliday ? "Edit" : "Add"} Holiday to {selectedPlan.holidayPlanName}
            </h2>
            <input
              type="date"
              value={holidayForm.holidayDate}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, holidayDate: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />
            <input
              type="text"
              placeholder="Description"
              value={holidayForm.description}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, description: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setHolidayModalOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHoliday}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayPlans;
