interface Column {
  key: string
  label: string
}

interface DataTableProps {
  columns: Column[]
  data: any[]
}

export default function DataTable({ columns, data }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition">
              {columns.map((column) => (
                <td key={`${idx}-${column.key}`} className="px-6 py-4 text-sm text-slate-600">
                  {column.key === "priority" ? (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        row[column.key] === "High"
                          ? "bg-red-100 text-red-700"
                          : row[column.key] === "Medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {row[column.key]}
                    </span>
                  ) : (
                    row[column.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="p-8 text-center text-slate-500">No data available</div>}
    </div>
  )
}
