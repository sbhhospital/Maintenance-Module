"use client"

import { useState, useEffect } from "react"
import Modal from "../Modal"

interface InspectionItem {
  id: string
  indentNo: string
  machineName: string
  completionStatus: string
  technicianName: string
  technicianPhone: string
  expectedDelivery: string
  imageLink: string
  inspectedBy: string
  inspectionDate: string
  inspectionResult: string
  remarks: string
  status: "pending" | "inspected"
  rowIndex: number
}

// App Script URL and Sheet Info
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRpoQQV8M3nNol5hl7ty81_3A06mbI8HxQNspk1Po4vcZ4CbidBVu8C_QeuA1zRiGn/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

export default function InspectionPage() {
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedItem, setSelectedItem] = useState<InspectionItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [formData, setFormData] = useState({
    inspectedBy: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    inspectionResult: "Done",
    remarks: "",
  })

  const pendingItems = inspectionItems.filter((item) => item.status === "pending")
  const historyItems = inspectionItems.filter((item) => item.status === "inspected")

  const inspectionResults = ["Done"]

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
      const inspectionItemsArray: InspectionItem[] = [];

      rows.forEach((row: any, index: number) => {
        const actualRowIndex = index + 3;
        const cells = row.c;

        // Fetch data from specified columns
        const indentNo = cells[1]?.v || ""; // Column B (index 1)
        const machineName = cells[2]?.v || ""; // Column C (index 2)
        const expectedDelivery = cells[6]?.v ? formatDate(cells[6]?.v) : ""; // Column G (index 6)
        const imageLink = cells[7]?.v || ""; // Column H (index 7)
        const technicianName = cells[16]?.v || ""; // Column Q (index 16)
        const technicianPhone = cells[17]?.v || ""; // Column R (index 17)

        // Get completion status from Column X (index 23)
        const completionStatus = cells[23]?.v || "";

        // Get inspection data from NEW column positions
        const actualValue = cells[26]?.v || ""; // Column AA (index 26) - New position
        const inspectedBy = cells[28]?.v || ""; // Column AC (index 28) - New position
        const inspectionDate = cells[29]?.v ? formatDate(cells[29]?.v) : ""; // Column AD (index 29) - New position
        const inspectionResult = cells[30]?.v || ""; // Column AE (index 30) - New position
        const remarks = cells[31]?.v || ""; // Column AF (index 31) - New position
        const plannedDate = cells[32]?.v ? formatDate(cells[32]?.v) : ""; // Column AG (index 32) - New position

        // Check if item is completed (Column X = "Completed") AND has technician assigned
        if (indentNo && completionStatus === "Completed" && technicianName) {
          // If actual value is empty/null (Column AA), show in pending
          if (!actualValue || actualValue === "") {
            inspectionItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              completionStatus,
              technicianName,
              technicianPhone,
              expectedDelivery,
              imageLink,
              inspectedBy,
              inspectionDate,
              inspectionResult,
              remarks,
              status: "pending",
              rowIndex: actualRowIndex,
            });
          }
          // If actual value exists (Column AA has value), show in history
          else {
            inspectionItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              completionStatus,
              technicianName,
              technicianPhone,
              expectedDelivery,
              imageLink,
              inspectedBy,
              inspectionDate,
              inspectionResult,
              remarks,
              status: "inspected",
              rowIndex: actualRowIndex,
            });
          }
        }
      });

      setInspectionItems(inspectionItemsArray);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateInspectionInSheet = async (inspectionItem: InspectionItem, formData: any) => {
  try {
    // Create array for all columns up to AG (33 columns total)
    const rowData = new Array(33).fill(""); // A through AG (33 columns)
    
    // Store inspection data in the appropriate columns
    // Column AA (index 26): Actual Value (Current timestamp)
    const now = new Date();
    const actualValue = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    rowData[26] = actualValue; // Column AA (index 26)
    
    // Column AC (index 28): Inspected By
    rowData[28] = formData.inspectedBy; // Column AC
    
    // Column AD (index 29): Inspection Date (from form input)
    rowData[29] = formData.inspectionDate; // Column AD
    
    // Column AE (index 30): Inspection Result
    rowData[30] = formData.inspectionResult; // Column AE
    
    // Column AF (index 31): Remarks
    rowData[31] = formData.remarks; // Column AF
    
    // Column AG (index 32): Planned Date (Current timestamp - same as Actual Value)
    rowData[32] = actualValue; // Column AG

    const params = new URLSearchParams({
      action: "update",
      sheetName: SHEET_NAME,
      rowIndex: inspectionItem.rowIndex.toString(),
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
    console.error("Error updating inspection:", error);
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

  const handleInspectClick = (item: InspectionItem) => {
  setSelectedItem(item);
  setFormData({
    inspectedBy: "", // Always start with empty string for inspectedBy
    inspectionDate: item.inspectionDate || new Date().toISOString().split("T")[0],
    inspectionResult: item.inspectionResult || "Done",
    remarks: item.remarks,
  });
  setShowModal(true);
}

  const handleConfirmInspection = async () => {
    if (selectedItem) {
      const success = await updateInspectionInSheet(selectedItem, formData);
      
      if (success) {
        // Update local state
        const updatedItems = inspectionItems.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                inspectedBy: formData.inspectedBy,
                inspectionDate: formData.inspectionDate,
                inspectionResult: formData.inspectionResult,
                remarks: formData.remarks,
                status: "inspected" as const,
              }
            : item,
        );
        setInspectionItems(updatedItems);
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
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Machine</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Technician</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Phone</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Completion</th>
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
              <td className="px-6 py-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {item.completionStatus}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-600">{item.expectedDelivery || "N/A"}</td>
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
                  onClick={() => handleInspectClick(item)}
                  className="px-4 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-600 font-medium transition"
                >
                  Inspect
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingItems.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No pending inspections</div>}
    </div>
  )

  const HistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Machine</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Inspected By</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Date</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Result</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Remarks</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Image</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-slate-600">{item.inspectedBy}</td>
              <td className="px-6 py-4 text-slate-600">{item.inspectionDate}</td>
              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.inspectionResult === "Done" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.inspectionResult}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-600">{item.remarks}</td>
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
      {historyItems.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No inspection history</div>}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Inspection</h1>
          <p className="text-slate-600">Inspect completed maintenance work</p>
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
                Pending ({pendingItems.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-3 font-medium text-sm transition ${
                  activeTab === "history"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                History ({historyItems.length})
              </button>
            </div>

            <div className="bg-white">{activeTab === "pending" ? <PendingTable /> : <HistoryTable />}</div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Inspection Record">
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
            <p className="text-sm text-slate-600 mt-1">
              Expected Delivery: <span className="font-semibold text-slate-900">{selectedItem?.expectedDelivery}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Inspected By</label>
            <input
              type="text"
              value={formData.inspectedBy}
              onChange={(e) => setFormData({ ...formData, inspectedBy: e.target.value })}
              placeholder="Enter inspector name"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Inspection Date</label>
            <input
              type="date"
              value={formData.inspectionDate}
              onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Inspection Result</label>
            <select
              value={formData.inspectionResult}
              onChange={(e) => setFormData({ ...formData, inspectionResult: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {inspectionResults.map((result) => (
                <option key={result} value={result}>
                  {result}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Add inspection remarks..."
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
              onClick={handleConfirmInspection}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 active:scale-95"
            >
              Complete Inspection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}