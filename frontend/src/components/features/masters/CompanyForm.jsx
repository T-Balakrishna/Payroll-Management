import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../auth/AuthContext";

export default function CompanyForm({ editData, onSave, onCancel }) {
  const { user } = useAuth();
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [form, setForm] = useState({
    companyName: "",
    companyAcr: "",
    registrationNumber: "",
    pan: "",
    gst: "",
    tin: "",
    phone: "",
    email: "",
    website: "",
    addressesText: "{}",
    bankName: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    financialYearStart: "",
    financialYearEnd: "",
    permissionHoursPerMonth: "0",
  });

  useEffect(() => {
    setForm({
      companyName: editData?.companyName || "",
      companyAcr: editData?.companyAcr || "",
      registrationNumber: editData?.registrationNumber || "",
      pan: editData?.pan || "",
      gst: editData?.gst || "",
      tin: editData?.tin || "",
      phone: editData?.phone || "",
      email: editData?.email || "",
      website: editData?.website || "",
      addressesText: editData?.addresses ? JSON.stringify(editData.addresses, null, 2) : "{}",
      bankName: editData?.bankName || "",
      bankAccountNumber: editData?.bankAccountNumber || "",
      bankIfscCode: editData?.bankIfscCode || "",
      financialYearStart: editData?.financialYearStart || "",
      financialYearEnd: editData?.financialYearEnd || "",
      permissionHoursPerMonth: String(editData?.permissionHoursPerMonth ?? 0),
    });
  }, [editData]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toNullable = (value) => {
    const parsed = String(value || "").trim();
    return parsed ? parsed : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.companyName.trim()) return toast.error("Company Name is required");
    if (!form.companyAcr.trim()) return toast.error("Acronym is required");

    let addresses = {};
    const addressesRaw = String(form.addressesText || "").trim();
    if (addressesRaw) {
      try {
        addresses = JSON.parse(addressesRaw);
        if (!addresses || typeof addresses !== "object") {
          toast.error("Addresses must be a valid JSON object");
          return;
        }
      } catch (err) {
        toast.error("Addresses must be valid JSON");
        return;
      }
    }

    const permissionHours = Number.parseInt(form.permissionHoursPerMonth, 10);

    const payload = {
      companyName: form.companyName.trim(),
      companyAcr: form.companyAcr.trim().toUpperCase(),
      registrationNumber: toNullable(form.registrationNumber),
      pan: toNullable(form.pan),
      gst: toNullable(form.gst),
      tin: toNullable(form.tin),
      phone: toNullable(form.phone),
      email: toNullable(form.email),
      website: toNullable(form.website),
      addresses,
      bankName: toNullable(form.bankName),
      bankAccountNumber: toNullable(form.bankAccountNumber),
      bankIfscCode: toNullable(form.bankIfscCode),
      financialYearStart: toNullable(form.financialYearStart),
      financialYearEnd: toNullable(form.financialYearEnd),
      permissionHoursPerMonth: Number.isNaN(permissionHours) ? 0 : permissionHours,
      status: editData?.status || "Active",
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.companyId);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Input
        label="Company Name"
        value={form.companyName}
        onChange={(e) => updateField("companyName", e.target.value)}
        placeholder="Enter company name"
        required
      />

      <Input
        label="Acronym"
        value={form.companyAcr}
        onChange={(e) => updateField("companyAcr", e.target.value)}
        placeholder="Enter short name (e.g. ABC, HRMS)"
        required
      />

      <Input
        label="Registration Number"
        value={form.registrationNumber}
        onChange={(e) => updateField("registrationNumber", e.target.value)}
        placeholder="Enter registration/CIN number"
      />

      <Input
        label="PAN"
        value={form.pan}
        onChange={(e) => updateField("pan", e.target.value)}
        placeholder="Enter PAN"
      />

      <Input
        label="GST"
        value={form.gst}
        onChange={(e) => updateField("gst", e.target.value)}
        placeholder="Enter GST number"
      />

      <Input
        label="TIN"
        value={form.tin}
        onChange={(e) => updateField("tin", e.target.value)}
        placeholder="Enter TIN"
      />

      <Input
        label="Phone"
        value={form.phone}
        onChange={(e) => updateField("phone", e.target.value)}
        placeholder="Enter phone number"
      />

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => updateField("email", e.target.value)}
        placeholder="Enter company email"
      />

      <Input
        label="Website"
        value={form.website}
        onChange={(e) => updateField("website", e.target.value)}
        placeholder="https://example.com"
      />

      <div className="md:col-span-2 lg:col-span-3">
        <label className="block font-medium text-gray-700 mb-2">Addresses (JSON)</label>
        <textarea
          value={form.addressesText}
          onChange={(e) => updateField("addressesText", e.target.value)}
          placeholder='{"registered":"Address line 1","branch":"Address line 2"}'
          rows={4}
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      <Input
        label="Bank Name"
        value={form.bankName}
        onChange={(e) => updateField("bankName", e.target.value)}
        placeholder="Enter bank name"
      />

      <Input
        label="Bank Account Number"
        value={form.bankAccountNumber}
        onChange={(e) => updateField("bankAccountNumber", e.target.value)}
        placeholder="Enter bank account number"
      />

      <Input
        label="Bank IFSC Code"
        value={form.bankIfscCode}
        onChange={(e) => updateField("bankIfscCode", e.target.value)}
        placeholder="Enter IFSC code"
      />

      <Input
        label="Financial Year Start"
        type="date"
        value={form.financialYearStart}
        onChange={(e) => updateField("financialYearStart", e.target.value)}
      />

      <Input
        label="Financial Year End"
        type="date"
        value={form.financialYearEnd}
        onChange={(e) => updateField("financialYearEnd", e.target.value)}
      />

      <Input
        label="Permission Hours Per Month"
        type="number"
        min="0"
        value={form.permissionHoursPerMonth}
        onChange={(e) => updateField("permissionHoursPerMonth", e.target.value)}
      />

      <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editData ? "Update Changes" : "Save"}</Button>
      </div>
    </form>
  );
}
