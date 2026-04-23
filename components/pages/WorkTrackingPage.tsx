"use client"

import { useState, useEffect } from "react"
import { Image as ImageIcon, RefreshCw } from "lucide-react"
import Modal from "../Modal"
import { toast } from "sonner"
import LoadingButton from "../LoadingButton"

interface WorkItem {
  id: string
  indentNo: string
  machineName: string
  department: string
  technicianName: string
  technicianPhone: string
  workNotes: string
  tat: string
  expectedDeliveryDate: string
  imageLink: string
  additionalNotes: string
  completionStatus: string
  status: "pending" | "completed"
  rowIndex: number
}

// App Script URL and Sheet Info
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyICPXs4C-5VETMpsaIZS6ftSHDrXMfHu3n70Mi2_J7JvuNN7tHlK1xyrkDpiDM5HPD/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

export default function WorkTrackingPage() {
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [formData, setFormData] = useState({
    additionalNotes: "",
    completionStatus: "Completed", // Only Completed status
  })

  // Remove "Pending" and "Hold" from completion statuses
  const completionStatuses = ["Completed", "Terminate"]

  const pendingItems = workItems.filter((item) => item.status === "pending")
  const historyItems = workItems.filter((item) => item.status === "completed")

  const formatDate = (dateValue: any) => {
    try {
      // Handle Google Sheets date format (Excel serial number)
      if (typeof dateValue === 'number') {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      // Handle string date formats like "Date(2025,10,28)"
      if (typeof dateValue === 'string') {
        const dateMatch = dateValue.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]) + 1;
          const day = parseInt(dateMatch[3]);
          return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }

        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
        return dateValue;
      }

      return "";
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateValue || "";
    }
  };

  const getFormattedDateTime = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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
      // Data Typically starts from Row 3 (index 2)
      const dataRows = data.slice(2);
      const workItemsArray: WorkItem[] = [];

      dataRows.forEach((row: any[], index: number) => {
        const actualRowIndex = index + 3;

        const indentNo = row[1] || ""; // Column B
        const machineName = row[2] || ""; // Column C
        const department = row[3] || ""; // Column D
        const expectedDeliveryDate = row[6] ? formatDate(row[6]) : ""; // Column G
        const imageLink = row[7] || ""; // Column H
        const technicianName = row[16] || ""; // Column Q
        const technicianPhone = row[17] || ""; // Column R
        const workNotes = row[19] || ""; // Column T - Work Notes
        const tat = row[41] || ""; // Column AP - TAT
        const approvalStatus = row[11] || ""; // Column L
        const completionStatus = row[23] || ""; // Column X
        const additionalNotes = row[24] || ""; // Column Y

        if (indentNo && approvalStatus === "approved" && technicianName) {
          if (completionStatus !== "Completed" && completionStatus !== "Terminate") {
            workItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              department,
              technicianName,
              technicianPhone,
              workNotes,
              tat,
              expectedDeliveryDate,
              imageLink,
              additionalNotes,
              completionStatus: completionStatus || "",
              status: "pending",
              rowIndex: actualRowIndex
            });
          } else {
            workItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              department,
              technicianName,
              technicianPhone,
              workNotes,
              tat,
              expectedDeliveryDate,
              imageLink,
              additionalNotes,
              completionStatus: completionStatus,
              status: "completed",
              rowIndex: actualRowIndex
            });
          }
        }
      });

      setWorkItems(workItemsArray);
      if (refreshing) toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateWorkInSheet = async (workItem: WorkItem, formData: any) => {
    try {
      const currentDateTime = getFormattedDateTime();

      console.log(`Updating row ${workItem.rowIndex} for Indent No: ${workItem.indentNo}`);

      // We use updateCell specifically for each column to avoid overwriting the whole row
      // V=22, X=24, Y=25, Z=26 (1-based indices for backend updateCell)
      const updates = [
        { col: 22, val: currentDateTime },           // Column V - Actual Date
        { col: 24, val: formData.completionStatus }, // Column X - Completion Status
        { col: 25, val: formData.additionalNotes },   // Column Y - Additional Notes
        { col: 26, val: currentDateTime }            // Column Z - Planned Date
      ];

      const results = await Promise.all(updates.map(u =>
        fetch(APP_SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "updateCell",
            sheetName: SHEET_NAME,
            rowIndex: workItem.rowIndex.toString(),
            columnIndex: u.col.toString(),
            value: u.val
          })
        }).then(r => r.json())
      ));

      const allSuccessful = results.every(r => r.success);
      if (!allSuccessful) console.error("Some updates failed:", results);
      return allSuccessful;
    } catch (error) {
      console.error("Error updating work:", error);
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

  const handleWorkClick = (item: WorkItem) => {
    setSelectedItem(item);
    setFormData({
      additionalNotes: item.additionalNotes,
      completionStatus: "Completed", // Default to Completed
    });
    setShowModal(true);
  }

  const handleConfirmWork = async () => {
    if (selectedItem) {
      setConfirming(true);
      try {
        const success = await updateWorkInSheet(selectedItem, formData);

        if (success) {
          // Update local state
          const updatedItems = workItems.map((item) =>
            item.id === selectedItem.id
              ? {
                ...item,
                additionalNotes: formData.additionalNotes,
                completionStatus: formData.completionStatus,
                // Set status to "completed" for both "Completed" and "Terminate"
                status: (formData.completionStatus === "Completed" || formData.completionStatus === "Terminate") ? ("completed" as const) : ("pending" as const),
              }
              : item,
          );
          setWorkItems(updatedItems);
          toast.success(`Work marked as ${formData.completionStatus}`);
        } else {
          toast.error("Failed to update work status");
        }

        setShowModal(false);
        setSelectedItem(null);

        setTimeout(() => {
          fetchSheetData(true);
        }, 1000);
      } catch (error) {
        console.error("Error in handleConfirmWork:", error);
        toast.error("An unexpected error occurred during work status update.");
      } finally {
        setConfirming(false);
      }
    }
  }

  const PendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-teal-50/50 border-b border-teal-100/50">
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Indent No</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Equipment</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Technician</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Work Notes</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Expected Delivery</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Image</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pendingItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{item.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.machineName}</td>
              <td className="px-6 py-5">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">{item.technicianName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{item.technicianPhone}</p>
                </div>
              </td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600 max-w-xs truncate">{item.workNotes}</td>
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
                    <ImageIcon size={18} />
                  </a>
                ) : (
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                    <ImageIcon size={18} className="opacity-40" />
                  </div>
                )}
              </td>
              <td className="px-6 py-5">
                <button
                  onClick={() => handleWorkClick(item)}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-orange-100"
                >
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingItems.length === 0 && !loading && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-[24px] flex items-center justify-center opacity-40">
            <RefreshCw className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Work</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Maintenance teams are currently idle</p>
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
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Indent No</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Equipment</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Technician</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Status</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Work Notes</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">TAT</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Delivery</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Image</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{item.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.machineName}</td>
              <td className="px-6 py-5">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">{item.technicianName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{item.technicianPhone}</p>
                </div>
              </td>
              <td className="px-6 py-5">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block transform transition-transform group-hover:scale-105 duration-300 ${item.completionStatus === "Completed"
                  ? "bg-green-100 text-green-700 shadow-sm shadow-green-100"
                  : "bg-red-100 text-red-700 shadow-sm shadow-red-100"
                  }`}>
                  {item.completionStatus}
                </span>
              </td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 italic max-w-xs truncate">{item.workNotes || "—"}</td>
              <td className="px-6 py-5 text-sm font-black text-teal-600">{item.tat}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">{item.expectedDeliveryDate || "—"}</td>
              <td className="px-6 py-5">
                {item.imageLink ? (
                  <a
                    href={item.imageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors shadow-sm"
                  >
                    <ImageIcon size={18} />
                  </a>
                ) : (
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                    <ImageIcon size={18} className="opacity-40" />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyItems.length === 0 && !loading && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-[24px] flex items-center justify-center opacity-40">
            <ImageIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">History Silent</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Completed records will appear here as they are processed</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="border-l-4 border-teal-500 pl-4">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-1">Work Tracking</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">Monitor maintenance execution and progress</p>
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
                In Progress ({pendingItems.length})
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Complete Work">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Indent No: <span className="font-semibold text-slate-900">{selectedItem?.indentNo}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Machine: <span className="font-semibold text-slate-900">{selectedItem?.machineName}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Technician: <span className="font-semibold text-slate-900">{selectedItem?.technicianName}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Phone: <span className="font-semibold text-slate-900">{selectedItem?.technicianPhone}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Completion Status</label>
            <select
              value={formData.completionStatus}
              onChange={(e) => setFormData({ ...formData, completionStatus: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {completionStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="Add notes about the work..."
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
              onClick={handleConfirmWork}
              isLoading={confirming}
              loadingText="Updating..."
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition shadow-md"
            >
              {formData.completionStatus === "Completed" ? "Mark as Completed" : "Mark as Terminate"}
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}