import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RefreshButton from "./RefreshButton";

// Fixed row height so the table body never resizes between pages
const ROW_HEIGHT_PX = 52;

export default function MasterTable({
  columns,
  children,
  loading = false,
  emptyMessage = "No records found",
  rowsPerPageOptions = [5, 10, 20, 50],
  defaultRowsPerPage = 5,
  onRefresh,
  loadingRefresh = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const rows = React.Children.toArray(children);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // Pad with empty rows so tbody height stays fixed
  const emptyRowCount = rowsPerPage - paginatedRows.length;

  const goTo = (page) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

  const startRow = totalRows === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const endRow = Math.min(safePage * rowsPerPage, totalRows);

  // Fixed tbody height = rowsPerPage × row height
  const tbodyHeight = rowsPerPage * ROW_HEIGHT_PX;

  return (
    <div className="flex flex-col border border-gray-200 rounded-2xl shadow-sm overflow-hidden bg-white">

      {/* Invisible-scrollbar table wrapper */}
      <div
        className="overflow-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
          .ms-table-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="ms-table-scroll overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Fixed-height tbody */}
            <tbody
              className="bg-white divide-y divide-gray-100"
              style={{ height: `${tbodyHeight}px`, display: loading ? "table-row-group" : undefined }}
            >
              {loading ? (
                <tr style={{ height: `${tbodyHeight}px` }}>
                  <td colSpan={columns.length} className="text-center text-gray-500 align-middle">
                    Loading...
                  </td>
                </tr>
              ) : totalRows === 0 ? (
                <tr style={{ height: `${tbodyHeight}px` }}>
                  <td colSpan={columns.length} className="text-center text-gray-400 text-sm align-middle">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedRows}
                  {/* Filler rows to keep height fixed */}
                  {Array.from({ length: emptyRowCount }).map((_, i) => (
                    <tr key={`filler-${i}`} style={{ height: `${ROW_HEIGHT_PX}px` }}>
                      <td colSpan={columns.length} />
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* {!loading && React.Children.count(children) === 0 && (
        <div className="py-12 text-center text-gray-500 bg-gray-50">{emptyMessage}</div>
      )} */}

      {/* Pagination Footer */}
      {!loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">

          {/* Left: rows per page + optional refresh */}
          <div className="flex items-center gap-3">
            {onRefresh && (
              <RefreshButton onRefresh={onRefresh} loading={loadingRefresh} />
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all shadow-sm cursor-pointer"
              >
                {rowsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: count + page navigation */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {startRow}–{endRow} of {totalRows}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goTo(1)}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-sm"
              >
                «
              </button>
              <button
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers with ellipsis */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goTo(item)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold border transition-all shadow-sm ${
                        safePage === item
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400 shadow-blue-200"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => goTo(totalPages)}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-sm"
              >
                »
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}