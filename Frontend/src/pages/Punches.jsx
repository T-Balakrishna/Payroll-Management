import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardList, X } from "lucide-react";

function Punches({ userRole, selectedCompanyId, selectedCompanyName }) {
  const [punches, setPunches] = useState([]);
  const [devices, setDevices] = useState([]);
  const [filteredPunches, setFilteredPunches] = useState([]);
  const [searchBy, setSearchBy] = useState("employeeNumber");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [selectedCompanyId]);

  useEffect(() => {
    handleSearch();
  }, [query, searchBy, punches, devices]);

  const fetchData = async () => {
    if (userRole === "Super Admin" && !selectedCompanyId) {
      setPunches([]);
      setFilteredPunches([]);
      setDevices([]);
      return;
    }
    try {
      let punchUrl = "http://localhost:5000/api/punches/get";
      if (selectedCompanyId) punchUrl += `?companyId=${selectedCompanyId}`;
      let deviceUrl = "http://localhost:5000/api/biometricDevices";
      if (selectedCompanyId) deviceUrl += `?companyId=${selectedCompanyId}`;
      const [punchRes, deviceRes] = await Promise.all([
        axios.get(punchUrl),
        axios.get(deviceUrl)
      ]);

      setPunches(punchRes.data);
      setFilteredPunches(punchRes.data);
      setDevices(deviceRes.data);
    } catch (err) {
      console.error("❌ Error fetching data:", err);
    }
  };

  const getLocation = (deviceIp) => {
    if (!deviceIp) return "?-?";
    const dev = devices.find(d => String(d.deviceIp).trim() === String(deviceIp).trim());
    // console.log(devices,dev);
    return dev ? dev.location : "?-";
  };

  const handleSearch = () => {
    // if(!query)return;
    const q = query.toLowerCase();
    let results = punches;

    if (searchBy === "biometricNumber") {
      results = punches.filter(p => p.biometricNumber?.toLowerCase().includes(q));
    } else if (searchBy === "location") {
      results = punches.filter(p => getLocation(p.deviceIp)?.toLowerCase().includes(q));
    } else if (searchBy === "date" && query) {
      results = punches.filter(p => new Date(p.punchTimestamp).toISOString().split("T")[0] === query);
    }

    setFilteredPunches(results);
  };

  if (userRole === "Super Admin" && !selectedCompanyId) {
    return (
      <div className="h-full flex flex-col px-6 py-4">
        <h1 className="text-2xl font-bold mb-4">Punches</h1>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center">Please select a company to view punches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full px-6 py-4 flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Punches{selectedCompanyName ? ` - ${selectedCompanyName}` : ""}</h1>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex gap-2 items-center">
          <select
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="biometricNumber">Biometric  Number</option>
            <option value="location">Location</option>
            <option value="date">Date</option>
          </select>

          {searchBy === "date" ? (
            <input
              type="date"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          ) : (
            <input
              type="text"
              placeholder={`Search by ${searchBy}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          )}
        </div>
      </div>

      {/* Punch Table */}      
    <div className="border border-gray-200 rounded-lg shadow-sm overflow-y-auto" style={{ maxHeight: "500px" }}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <tr>
            <th className="py-3 px-4">Biometric Number</th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Time</th>
            <th className="py-3 px-4">Location</th>
          </tr>
        </thead>
        <tbody>
          {filteredPunches.map((p) => {
            const dateObj = new Date(p.punchTimestamp);
            return (
              <tr key={p.punchId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{p.biometricNumber || "-"}</td>
                <td className="py-2 px-4">{dateObj.toLocaleDateString("en-IN")}</td>
                <td className="py-2 px-4">{dateObj.toLocaleTimeString("en-IN")}</td>
                <td className="py-2 px-4">{getLocation(p.deviceIp)}</td>
              </tr>
            );
          })}
          {filteredPunches.length === 0 && (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No punches found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    </div>
  );
}

export default Punches;