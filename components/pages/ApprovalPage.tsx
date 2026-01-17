"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, RefreshCw, Images } from "lucide-react"

interface ApprovalItem {
  id: string
  indentNo: string
  machineName: string
  department: string
  problem: string
  priority: string
  expectedDays: number
  status: "pending" | "history"
  originalStatus?: string
  remarks: string
  rowIndex: number
  columnJValue?: string
  expectedDeliveryDate?: string
  tat?: string
  imageLink?: string
}

// App Script URL
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRpoQQV8M3nNol5hl7ty81_3A06mbI8HxQNspk1Po4vcZ4CbidBVu8C_QeuA1zRiGn/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

// Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [remarkInput, setRemarkInput] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<"approve" | "reject">("approve")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const pendingItems = items.filter((item) => item.status === "pending");
  const historyItems = items.filter((item) => item.status === "history");

  const formatDate = (dateValue: any) => {
    try {
      // Handle Google Sheets date format (Excel serial number)
      if (typeof dateValue === 'number') {
        // Excel/Google Sheets date serial number (days since Dec 30, 1899)
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Fixed: getMonth() + 1
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      // Handle string date formats like "Date(2025,10,28)"
      if (typeof dateValue === 'string') {
        // Check if it's in the format "Date(2025,10,28)"
        const dateMatch = dateValue.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]) + 1; // JavaScript months are 0-indexed, so add 1
          const day = parseInt(dateMatch[3]);
          return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }

        // Try parsing as regular date string
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
        return dateValue; // Return as-is if not a valid date
      }

      return "";
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateValue || "";
    }
  };

  const fetchSheetData = async () => {
    try {
      setLoading(true);

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        SHEET_NAME
      )}`;

      const response = await fetch(sheetUrl);
      const text = await response.text();

      const jsonText = text.substring(
        text.indexOf("{"),
        text.lastIndexOf("}") + 1
      );
      const data = JSON.parse(jsonText);

      const rows = data.table.rows.slice(1);
      const itemsArray: ApprovalItem[] = [];

      rows.forEach((row: any, index: number) => {
        // FIXED: Add 3 because data starts from row 3 (row 1 is header, row 2 might be subheader/empty)
        const actualRowIndex = index + 3;
        const cells = row.c;

        const indentNo = cells[1]?.v || ""; // Column B
        const machineName = cells[2]?.v || "";
        const department = cells[3]?.v || "";
        const problem = cells[4]?.v || "";
        const priority = cells[5]?.v || "Medium";
        const expectedDeliveryDate = cells[6]?.v ? formatDate(cells[6]?.v) : "";
        const tat = cells[39]?.v || "";
        const imageLink = cells[7]?.v || "";
        const columnJValue = cells[9]?.v || ""; // Column J - approval timestamp
        const status = cells[11]?.v || ""; // Column K - status
        const remarks = cells[12]?.v || ""; // Column L - remarks

        // Determine status based on Column J (timestamp)
        const displayStatus = columnJValue === "" ? "pending" : "history";

        // Only add rows that have an indent number
        if (indentNo) {
          itemsArray.push({
            id: `${indentNo}-${actualRowIndex}`, // Unique ID with indent no and row
            indentNo,
            machineName,
            department,
            problem,
            priority,
            expectedDays: 3,
            status: displayStatus,
            originalStatus: status || undefined,
            remarks: remarks,
            rowIndex: actualRowIndex, // FIXED: Now using correct row number
            columnJValue,
            expectedDeliveryDate,
            tat,
            imageLink,
          });
        }
      });

      setItems(itemsArray);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Format date to dd/mm/yyyy hh:mm:ss
  const formatDateTime = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Update item in Google Sheets via App Script
  const updateItemInSheet = async (item: ApprovalItem, status: "approved" | "rejected", remarks: string) => {
    try {
      const currentDateTime = formatDateTime();

      // Create array for all columns (A-M at minimum)
      const rowData = new Array(14).fill(""); // A to N columns

      // Set the values in correct columns
      rowData[9] = currentDateTime; // Column J (index 9) - Timestamp in dd/mm/yyyy hh:mm:ss format
      rowData[11] = status; // Column K (index 10) - Status
      rowData[12] = remarks; // Column L (index 11) - Remarks
      rowData[13] = currentDateTime; // Column M (index 12) - Planned date (using same as timestamp)
      // Column N (index 13) remains empty

      console.log(`Updating row ${item.rowIndex} for Indent No: ${item.indentNo}`);
      console.log(`Row data:`, rowData);

      const params = new URLSearchParams({
        action: "update",
        sheetName: SHEET_NAME,
        rowIndex: item.rowIndex.toString(),
        rowData: JSON.stringify(rowData),
      });

      const response = await fetch(APP_SCRIPT_URL, {
        method: "POST",
        body: params,
        mode: "no-cors",
      });

      // Wait a bit for the update to process
      await new Promise(resolve => setTimeout(resolve, 500));

      return true;
    } catch (error) {
      console.error("Error updating sheet:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSheetData();
  };

  const handleActionClick = (item: ApprovalItem, action: "approve" | "reject") => {
    setSelectedItem(item);
    setModalAction(action);
    setRemarkInput("");
    setShowModal(true);
  };

  const handleConfirmAction = async () => {
    if (selectedItem) {
      const newStatus = modalAction === "approve" ? "approved" : "rejected";

      // Update in Google Sheets
      const success = await updateItemInSheet(selectedItem, newStatus, remarkInput);

      if (success) {
        // Update local state
        const updatedItems = items.map((item) =>
          item.id === selectedItem.id
            ? {
              ...item,
              status: "history" as const,
              originalStatus: newStatus,
              remarks: remarkInput,
              columnJValue: formatDateTime(),
            }
            : item
        );
        setItems(updatedItems);
      }

      setShowModal(false);
      setSelectedItem(null);

      // Refresh data after a short delay to confirm update
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    }
  };

  const PendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Equipment</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Priority</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Expected Delivery</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Image</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Problem</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {pendingItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-sm text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.department}</td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${item.priority === "High"
                      ? "bg-red-100 text-red-700"
                      : item.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                >
                  {item.priority}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {item.expectedDeliveryDate || "N/A"}
              </td>
              <td className="px-6 py-4 text-sm">
                {item.imageLink ? (
                  <a
                    href={item.imageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    <Images size={20} />
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">No Image</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.problem}</td>
              <td className="px-6 py-4 text-sm space-x-2 flex">
                <button
                  onClick={() => handleActionClick(item, "approve")}
                  className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition"
                  title="Approve"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleActionClick(item, "reject")}
                  className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition"
                  title="Reject"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingItems.length === 0 && !loading && (
        <div className="p-8 text-center text-slate-500">No pending approvals</div>
      )}
    </div>
  );

  const HistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Equipment</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Problem</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Expected Delivery</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">TAT</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Image</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${item.originalStatus === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                >
                  {item.originalStatus ? item.originalStatus.charAt(0).toUpperCase() + item.originalStatus.slice(1) : "Processed"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.department}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.problem}</td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {item.expectedDeliveryDate || "N/A"}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {item.tat || "-"}
              </td>
              <td className="px-6 py-4 text-sm">
                {item.imageLink ? (
                  <a
                    href={item.imageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    <Images size={20} />
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">No Image</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.remarks || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyItems.length === 0 && !loading && (
        <div className="p-8 text-center text-slate-500">No history records</div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Approvals</h1>
          <p className="text-slate-600">Review and approve maintenance indents</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 px-6 py-3 font-medium text-sm transition ${activeTab === "pending"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Pending ({pendingItems.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-3 font-medium text-sm transition ${activeTab === "history"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                History ({historyItems.length})
              </button>
            </div>

            <div className="bg-white">
              {activeTab === "pending" ? <PendingTable /> : <HistoryTable />}
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${modalAction === "approve" ? "Approve" : "Reject"} Indent`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Indent No: <span className="font-semibold text-slate-900">{selectedItem?.indentNo}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Machine: <span className="font-semibold text-slate-900">{selectedItem?.machineName}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Department: <span className="font-semibold text-slate-900">{selectedItem?.department}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Expected Delivery: <span className="font-semibold text-slate-900">{selectedItem?.expectedDeliveryDate || "N/A"}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Problem: <span className="font-semibold text-slate-900">{selectedItem?.problem}</span>
            </p>
            {selectedItem?.imageLink && (
              <p className="text-sm text-slate-600 mt-1">
                Image:{" "}
                <a
                  href={selectedItem.imageLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View Image
                </a>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Remark/Comments</label>
            <textarea
              value={remarkInput}
              onChange={(e) => setRemarkInput(e.target.value)}
              placeholder="Enter your remarks..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              className={`px-4 py-2 rounded-lg text-white font-medium transition relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 active:scale-95 ${modalAction === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
            >
              {modalAction === "approve" ? "Approve" : "Reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}