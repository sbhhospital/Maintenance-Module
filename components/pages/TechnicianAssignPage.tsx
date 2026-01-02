"use client"

import { useState, useEffect } from "react"
import Modal from "../Modal"

interface Assignment {
  id: string
  indentNo: string
  machineName: string
  department: string
  problem: string
  priority: string
  expectedDeliveryDate: string
  imageLink: string
  remarks: string
  status: string
  rowIndex: number
  technicianName: string
  technicianPhone: string
  assignedDate: string
  workNotes: string
}

const dummyTechnicians = [
  { name: "John Smith", phone: "+1-555-0101" },
  { name: "Mike Johnson", phone: "+1-555-0102" },
  { name: "Sarah Williams", phone: "+1-555-0103" },
]

// App Script URL and Sheet Info
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRpoQQV8M3nNol5hl7ty81_3A06mbI8HxQNspk1Po4vcZ4CbidBVu8C_QeuA1zRiGn/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

export default function TechnicianAssignPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [formData, setFormData] = useState({
    technicianName: "",
    technicianPhone: "",
    assignedDate: new Date().toISOString().split("T")[0],
    workNotes: "",
  })

  const pendingAssignments = assignments.filter((a) => a.status === "pending")
  const historyAssignments = assignments.filter((a) => a.status === "assigned")

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
      const assignmentsArray: Assignment[] = [];

      rows.forEach((row: any, index: number) => {
        const actualRowIndex = index + 3;
        const cells = row.c;

        const indentNo = cells[1]?.v || ""; // Column B
        const machineName = cells[2]?.v || "";
        const department = cells[3]?.v || "";
        const problem = cells[4]?.v || "";
        const priority = cells[5]?.v || "Medium";
        const expectedDeliveryDate = cells[6]?.v ? formatDate(cells[6]?.v) : "";
        const imageLink = cells[7]?.v || "";
        const columnJValue = cells[9]?.v || ""; // Column J - approval timestamp
        const status = cells[11]?.v || ""; // Column L - status (approval status)
        const remarks = cells[12]?.v || ""; // Column M - remarks
        const technicianName = cells[16]?.v || ""; // Column Q - technician name
        const technicianPhone = cells[17]?.v || ""; // Column R - technician phone
        const assignedDate = cells[18]?.v ? formatDate(cells[18]?.v) : ""; // Column S - assigned date
        const workNotes = cells[19]?.v || ""; // Column T - work notes
        const plannedDate = cells[20]?.v || ""; // Column U - planned date
        const actualDate = cells[14]?.v || ""; // Column O - actual date

        // Show in Pending tab if:
        // 1. Has indent number
        // 2. Is approved (status = "approved") in Column L
        // 3. Column Q (technician name) is empty/null
        if (indentNo && status === "approved" && !technicianName) {
          assignmentsArray.push({
            id: `${indentNo}-${actualRowIndex}`,
            indentNo,
            machineName,
            department,
            problem,
            priority,
            expectedDeliveryDate,
            imageLink,
            remarks,
            status: "pending",
            rowIndex: actualRowIndex,
            technicianName: "",
            technicianPhone: "",
            assignedDate: "",
            workNotes: "",
          });
        }
        // Show in History tab if:
        // 1. Has indent number
        // 2. Is approved (status = "approved") in Column L
        // 3. Column Q (technician name) has a value (not null/empty)
        else if (indentNo && status === "approved" && technicianName) {
          assignmentsArray.push({
            id: `${indentNo}-${actualRowIndex}`,
            indentNo,
            machineName,
            department,
            problem,
            priority,
            expectedDeliveryDate,
            imageLink,
            remarks,
            status: "assigned",
            rowIndex: actualRowIndex,
            technicianName,
            technicianPhone,
            assignedDate,
            workNotes,
          });
        }
      });

      setAssignments(assignmentsArray);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateAssignmentInSheet = async (assignment: Assignment, formData: any) => {
    try {
      // Create array for all columns (A-U at minimum)
      const rowData = new Array(21).fill("");
      
      // Store technician name in Column Q (index 16)
      rowData[16] = formData.technicianName;
      
      // Store phone number in Column R (index 17)
      rowData[17] = formData.technicianPhone;
      
      // Store assigned date in Column S (index 18)
      rowData[18] = formData.assignedDate;
      
      // Store work notes/remarks in Column T (index 19)
      rowData[19] = formData.workNotes;
      
      // Store planned date in Column U (index 20) in dd/mm/yyyy hh:mm:ss format
      const plannedDateTime = getFormattedDateTime();
      rowData[20] = plannedDateTime;
      
      // Store actual date in Column O (index 14) in dd/mm/yyyy hh:mm:ss format
      const actualDateTime = getFormattedDateTime();
      rowData[14] = actualDateTime;

      const params = new URLSearchParams({
        action: "update",
        sheetName: SHEET_NAME,
        rowIndex: assignment.rowIndex.toString(),
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
      console.error("Error updating assignment:", error);
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

  const handleAssignClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      technicianName: "",
      technicianPhone: "",
      assignedDate: new Date().toISOString().split("T")[0],
      workNotes: "",
    });
    setShowModal(true);
  }

  const handleConfirmAssign = async () => {
    if (selectedAssignment) {
      const success = await updateAssignmentInSheet(selectedAssignment, formData);
      
      if (success) {
        // Update local state
        const updatedAssignments = assignments.map((a) =>
          a.id === selectedAssignment.id
            ? {
                ...a,
                technicianName: formData.technicianName,
                technicianPhone: formData.technicianPhone,
                assignedDate: formData.assignedDate,
                workNotes: formData.workNotes,
                status: "assigned" as const,
              }
            : a,
        );
        setAssignments(updatedAssignments);
      }
      
      setShowModal(false);
      setSelectedAssignment(null);
      
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    }
  }

  const PendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Equipment</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Problem</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Priority</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Expected Delivery</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Image</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Remarks</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {pendingAssignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-sm text-slate-900 font-medium">{assignment.indentNo}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.machineName}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.department}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.problem}</td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    assignment.priority === "High"
                      ? "bg-red-100 text-red-700"
                      : assignment.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {assignment.priority}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.expectedDeliveryDate || "N/A"}</td>
              <td className="px-6 py-4 text-sm">
                {assignment.imageLink ? (
                  <a 
                    href={assignment.imageLink} 
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
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.remarks || "N/A"}</td>
              <td className="px-6 py-4 text-sm">
                <button
                  onClick={() => handleAssignClick(assignment)}
                  className="px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 font-medium transition"
                >
                  Assign
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingAssignments.length === 0 && !loading && (
        <div className="p-8 text-center text-slate-500">No pending assignments</div>
      )}
    </div>
  )

  const HistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Equipment</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Problem</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Technician</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Phone</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Assigned Date</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Work Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {historyAssignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-sm text-slate-900 font-medium">{assignment.indentNo}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.machineName}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.department}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.problem}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.technicianName}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.technicianPhone}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.assignedDate}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{assignment.workNotes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyAssignments.length === 0 && !loading && (
        <div className="p-8 text-center text-slate-500">No assignment history</div>
      )}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Technician Assignment</h1>
          <p className="text-slate-600">Assign technicians to maintenance tasks</p>
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
                Pending ({pendingAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-3 font-medium text-sm transition ${
                  activeTab === "history"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                History ({historyAssignments.length})
              </button>
            </div>

            <div className="bg-white">{activeTab === "pending" ? <PendingTable /> : <HistoryTable />}</div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Technician">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Technician Name</label>
            <input
              type="text"
              value={formData.technicianName}
              onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
              placeholder="Enter technician name"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
            <input
              type="text"
              value={formData.technicianPhone}
              onChange={(e) => setFormData({ ...formData, technicianPhone: e.target.value })}
              placeholder="Enter phone number"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Date</label>
            <input
              type="date"
              value={formData.assignedDate}
              onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Work Notes/Remarks</label>
            <textarea
              value={formData.workNotes}
              onChange={(e) => setFormData({ ...formData, workNotes: e.target.value })}
              placeholder="Enter work notes..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p>Note: Planned and Actual date/time will be automatically saved when you assign the technician.</p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAssign}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 active:scale-95"
            >
              Assign Technician
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}