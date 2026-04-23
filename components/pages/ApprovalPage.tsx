"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, RefreshCw, Images } from "lucide-react"
import { toast } from "sonner"
import LoadingButton from "../LoadingButton"

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
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyICPXs4C-5VETMpsaIZS6ftSHDrXMfHu3n70Mi2_J7JvuNN7tHlK1xyrkDpiDM5HPD/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

// Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-premium max-w-lg w-full overflow-hidden border border-teal-50 animate-in zoom-in-95 duration-500">
        <div className="px-8 py-6 border-b border-teal-50 bg-teal-50/30 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-teal-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8">
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
  const [confirming, setConfirming] = useState(false)

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

  const fetchSheetData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      const response = await fetch(`${APP_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();

      if (!result.success || !Array.isArray(result.data)) {
        console.error("Invalid response format:", result);
        throw new Error(result.error || "Failed to fetch data array");
      }

      const data = result.data;

      // The data is a 2D array: [ [header], [row2], [row3], ... ]
      // Typically data starts from Row 3 (index 2)
      const dataRows = data.slice(2);


      const itemsArray: ApprovalItem[] = [];

      dataRows.forEach((row: any[], index: number) => {
        // actualRowIndex = index + 3 (since we sliced from index 2, and rows are 1-indexed)
        const actualRowIndex = index + 3;

        const indentNo = row[1] || ""; // Column B
        const machineName = row[2] || "";
        const department = row[3] || "";
        const problem = row[4] || "";
        const priority = row[5] || "Medium";
        const expectedDeliveryDate = row[6] ? formatDate(row[6]) : "";
        const tat = row[39] || "";
        const imageLink = row[7] || "";
        const columnJValue = row[9] || ""; // Column J - approval timestamp
        const status = row[11] || ""; // Column L - status
        const remarks = row[12] || ""; // Column M - remarks

        // Determine status based on Column J (timestamp)
        const displayStatus = columnJValue === "" ? "pending" : "history";

        if (indentNo) {
          itemsArray.push({
            id: `${indentNo}-${actualRowIndex}`,
            indentNo,
            machineName,
            department,
            problem,
            priority,
            expectedDays: 3,
            status: displayStatus,
            originalStatus: status || undefined,
            remarks: remarks,
            rowIndex: actualRowIndex,
            columnJValue,
            expectedDeliveryDate,
            tat,
            imageLink,
          });
        }
      });

      setItems(itemsArray);
      if (refreshing) toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast.error("Failed to fetch data");
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
  const updateItemInSheet = async (item: ApprovalItem, status: "approved" | "rejected", remarks: string) => {
    try {
      const currentDateTime = formatDateTime();

      console.log(`Updating row ${item.rowIndex} for Indent No: ${item.indentNo}`);
      const updates = [
        { col: 10, val: currentDateTime }, // Column J - Approval Date
        { col: 12, val: status },          // Column L - Status
        { col: 13, val: remarks },         // Column M - Remarks
        { col: 14, val: currentDateTime }  // Column N - Planned Date
      ];

      // Perform updates concurrently
      const results = await Promise.all(updates.map(u =>
        fetch(APP_SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "updateCell",
            sheetName: SHEET_NAME,
            rowIndex: item.rowIndex.toString(),
            columnIndex: u.col.toString(),
            value: u.val
          })
        }).then(r => r.json())
      ));

      const allSuccessful = results.every(r => r.success);

      if (!allSuccessful) {
        console.error("Some updates failed:", results);
      }

      return allSuccessful;
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
      setConfirming(true);
      try {
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
          toast.success(`Indent ${modalAction === "approve" ? "approved" : "rejected"} successfully`);
        } else {
          toast.error(`Failed to ${modalAction} indent`);
        }

        setShowModal(false);
        setSelectedItem(null);

        // Refresh data after a short delay to confirm update
        setTimeout(() => {
          fetchSheetData(true);
        }, 1000);
      } catch (error) {
        console.error(`Error confirming ${modalAction}:`, error);
        toast.error(`An unexpected error occurred while ${modalAction}ing`);
      } finally {
        setConfirming(false);
      }
    }
  };

  const PendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-teal-50/50 border-b border-teal-100/50">
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Indent No</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Equipment</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Department</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Priority</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Expected Delivery</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Image</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Problem</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pendingItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{item.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.machineName}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.department}</td>
              <td className="px-6 py-5">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block transform transition-transform group-hover:scale-105 ${item.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : item.priority === "Medium"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-teal-100 text-teal-700"
                    }`}
                >
                  {item.priority}
                </span>
              </td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">
                {item.expectedDeliveryDate || "—"}
              </td>
              <td className="px-6 py-5">
                {item.imageLink ? (
                  <a
                    href={item.imageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors shadow-sm"
                  >
                    <Images size={18} />
                  </a>
                ) : (
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                    <Images size={18} className="opacity-40" />
                  </div>
                )}
              </td>
              <td className="px-6 py-5 text-sm text-slate-600 max-w-xs truncate font-medium">{item.problem}</td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleActionClick(item, "approve")}
                    className="p-2.5 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm hover:shadow-teal-100"
                    title="Approve"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleActionClick(item, "reject")}
                    className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-100"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingItems.length === 0 && !loading && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-[24px] flex items-center justify-center opacity-40">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Clear Queue</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">No pending maintenance requests to review</p>
          </div>
        </div>
      )}
    </div>
  );

  const HistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-teal-50/50 border-b border-teal-100/50">
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Indent No</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Equipment</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Department</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Problem</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Delivery</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">TAT</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Image</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block transform transition-transform group-hover:scale-105 duration-300 ${item.originalStatus === "approved"
                    ? "bg-green-100 text-green-700 shadow-sm shadow-green-100"
                    : "bg-red-100 text-red-700 shadow-sm shadow-red-100"
                    }`}
                >
                  {item.originalStatus ? item.originalStatus : "Processed"}
                </span>
              </td>
              <td className="px-6 py-5 text-sm font-black text-slate-800">{item.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.machineName}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.department}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600 max-w-xs truncate">{item.problem}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">
                {item.expectedDeliveryDate || "—"}
              </td>
              <td className="px-6 py-5 text-sm font-black text-teal-600">
                {item.tat || "—"}
              </td>
              <td className="px-6 py-5">
                {item.imageLink ? (
                  <a
                    href={item.imageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors shadow-sm"
                  >
                    <Images size={18} />
                  </a>
                ) : (
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                    <Images size={18} className="opacity-40" />
                  </div>
                )}
              </td>
              <td className="px-6 py-5 text-sm text-slate-500 italic max-w-xs truncate">{item.remarks || "No comments"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyItems.length === 0 && !loading && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center opacity-40">
            <RefreshCw className="w-8 h-8 text-slate-300" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">History Silent</p>
            <p className="text-[10px] text-slate-300 font-medium mt-1">Processed records will appear here as the list grows</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="border-l-4 border-teal-500 pl-4">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-1">Approvals</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">Review and verify maintenance requests</p>
        </div>
        <LoadingButton
          onClick={handleRefresh}
          isLoading={refreshing}
          loadingText="Syncing..."
          className="flex items-center gap-2 px-6 py-3 bg-teal-50 text-teal-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-teal-100 transition shadow-sm border border-teal-100/50"
          icon={<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />}
        >
          Refresh Data
        </LoadingButton>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-[32px] shadow-soft border border-teal-50 overflow-hidden hover:shadow-premium transition-all duration-500">
            <div className="flex border-b border-teal-50 p-2 bg-slate-50/30">
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-bold text-xs uppercase tracking-[0.2em] transition-all rounded-[24px] ${activeTab === "pending"
                  ? "text-teal-600 bg-white shadow-sm ring-1 ring-teal-100"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeTab === "pending" ? "bg-teal-500 animate-pulse" : "bg-slate-300"}`} />
                Pending ({pendingItems.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-bold text-xs uppercase tracking-[0.2em] transition-all rounded-[24px] ${activeTab === "history"
                  ? "text-teal-600 bg-white shadow-sm ring-1 ring-teal-100"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeTab === "history" ? "bg-teal-500" : "bg-slate-300"}`} />
                History ({historyItems.length})
              </button>
            </div>

            <div className="p-2">
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
              disabled={confirming}
            >
              Cancel
            </button>
            <LoadingButton
              onClick={handleConfirmAction}
              isLoading={confirming}
              loadingText={modalAction === "approve" ? "Approving..." : "Rejecting..."}
              className={`px-4 py-2 rounded-lg text-white font-medium transition shadow-md ${modalAction === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
            >
              {modalAction === "approve" ? "Approve" : "Reject"}
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}