export default function MasterTable({ columns, children, loading = false, emptyMessage = "No records found" }) {
  return (
    <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1" style={{ maxHeight: "320px" }}>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="py-3 px-4 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {/* {!loading && React.Children.count(children) === 0 && (
        <div className="py-12 text-center text-gray-500 bg-gray-50">{emptyMessage}</div>
      )} */}
    </div>
  );
}
