"use client"

import { useState, useEffect } from "react"
import Modal from "../Modal"

interface WorkItem {
  id: string
  indentNo: string
  machineName: string
  department: string
  technicianName: string
  technicianPhone: string
  workNotes: string
  expectedDeliveryDate: string
  imageLink: string
  additionalNotes: string
  completionStatus: string
  status: "pending" | "completed"
  rowIndex: number
}

// App Script URL and Sheet Info
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRpoQQV8M3nNol5hl7ty81_3A06mbI8HxQNspk1Po4vcZ4CbidBVu8C_QeuA1zRiGn/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

export default function WorkTrackingPage() {
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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

      const rows = data.table.rows;
      const workItemsArray: WorkItem[] = [];

      rows.forEach((row: any, index: number) => {
        const actualRowIndex = index + 3;
        const cells = row.c;

        // Fetch data from specified columns
        const indentNo = cells[1]?.v || ""; // Column B (index 1)
        const machineName = cells[2]?.v || ""; // Column C (index 2)
        const department = cells[3]?.v || ""; // Column D (index 3)
        const expectedDeliveryDate = cells[6]?.v ? formatDate(cells[6]?.v) : ""; // Column G (index 6)
        const imageLink = cells[7]?.v || ""; // Column H (index 7)
        const technicianName = cells[16]?.v || ""; // Column Q (index 16)
        const technicianPhone = cells[17]?.v || ""; // Column R (index 17)
        const workNotes = cells[19]?.v || ""; // Column T (index 19) - Work Notes
        
        // Check if item is approved (status = "approved") in Column L (index 11)
        const approvalStatus = cells[11]?.v || "";
        
        // Get completion status from Column X (index 23)
        const completionStatus = cells[23]?.v || "";
        
        // Get additional notes from Column Y (index 24)
        const additionalNotes = cells[24]?.v || "";
        
        // Check if item has technician assigned (Column Q not empty) AND is approved
        if (indentNo && approvalStatus === "approved" && technicianName) {
          // If technician is assigned but completion status is NOT "Completed" or "Terminate" - show in pending
          if (completionStatus !== "Completed" && completionStatus !== "Terminate") {
            workItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              department,
              technicianName,
              technicianPhone,
              workNotes,
              expectedDeliveryDate,
              imageLink,
              additionalNotes,
              completionStatus: completionStatus || "",
              status: "pending",
              rowIndex: actualRowIndex
            });
          }
          // If technician is assigned AND completion status is "Completed" or "Terminate" - show in history
          else if (completionStatus === "Completed" || completionStatus === "Terminate") {
            workItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              department,
              technicianName,
              technicianPhone,
              workNotes,
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
    } catch (error) {
      console.error("Error fetching sheet data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateWorkInSheet = async (workItem: WorkItem, formData: any) => {
    try {
      // Create array for all columns (A-Z at minimum - 26 columns)
      const rowData = new Array(26).fill(""); // A through Z (26 columns)
      
      // Store Actual Date in Column V (index 21) in dd/mm/yyyy hh:mm:ss format
      const actualDateTime = getFormattedDateTime();
      rowData[21] = actualDateTime;
      
      // Store Completion Status in Column X (index 23)
      rowData[23] = formData.completionStatus;
      
      // Store Additional Notes in Column Y (index 24)
      rowData[24] = formData.additionalNotes;
      
      // Store Planned Date in Column Z (index 25) in dd/mm/yyyy hh:mm:ss format
      const plannedDateTime = getFormattedDateTime();
      rowData[25] = plannedDateTime;

      const params = new URLSearchParams({
        action: "update",
        sheetName: SHEET_NAME,
        rowIndex: workItem.rowIndex.toString(),
        rowData: JSON.stringify(rowData),
      });

      const response = await fetch(APP_SCRIPT_URL, {
        method: "POST",
        body: params,
        mode: "no-cors",
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
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
                status: (formData.completionStatus === "Completed" || formData.completionStatus === "Terminate") ? "completed" : ("pending" as const),
              }
            : item,
        );
        setWorkItems(updatedItems);
      }
      
      setShowModal(false);
      setSelectedItem(null);
      
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    }
  }

  const PendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Equipment</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Technician</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Phone</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Work Notes</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Expected Delivery</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Image</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {pendingItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-slate-600">{item.technicianName}</td>
              <td className="px-6 py-4 text-slate-600">{item.technicianPhone}</td>
              <td className="px-6 py-4 text-slate-600">{item.workNotes}</td>
              <td className="px-6 py-4 text-slate-600">{item.expectedDeliveryDate || "N/A"}</td>
              <td className="px-6 py-4 text-sm">
                {item.imageLink ? (
                  <a 
                    href={item.imageLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    View Image
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">No Image</span>
                )}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleWorkClick(item)}
                  className="px-4 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 font-medium transition"
                >
                  Update Work
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingItems.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No pending work items</div>}
    </div>
  )

  const HistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Equipment</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Technician</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Phone</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Work Notes</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Expected Delivery</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Image</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-slate-600">{item.technicianName}</td>
              <td className="px-6 py-4 text-slate-600">{item.technicianPhone}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.completionStatus === "Completed" 
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {item.completionStatus}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-600">{item.workNotes}</td>
              <td className="px-6 py-4 text-slate-600">{item.expectedDeliveryDate || "N/A"}</td>
              <td className="px-6 py-4 text-sm">
                {item.imageLink ? (
                  <a 
                    href={item.imageLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    View Image
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">No Image</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyItems.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No work history</div>}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Work Tracking</h1>
          <p className="text-slate-600">Monitor and update maintenance work progress</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={`w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full ${refreshing ? "animate-spin" : ""}`}></span>
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
                className={`flex-1 px-6 py-3 font-medium text-sm transition ${
                  activeTab === "pending"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                In Progress ({pendingItems.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-3 font-medium text-sm transition ${
                  activeTab === "history"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Completed/Terminate ({historyItems.length})
              </button>
            </div>

            <div className="bg-white">{activeTab === "pending" ? <PendingTable /> : <HistoryTable />}</div>
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

          <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p>Note: Actual date/time and Planned date/time will be automatically saved in dd/mm/yyyy hh:mm:ss format.</p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmWork}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 active:scale-95"
            >
              {formData.completionStatus === "Completed" ? "Mark as Completed" : "Mark as Terminate"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}