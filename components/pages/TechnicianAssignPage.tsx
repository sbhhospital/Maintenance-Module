"use client"

import { useState, useEffect } from "react"
import { Image as ImageIcon, RefreshCw } from "lucide-react"
import Modal from "../Modal"
import { toast } from "sonner"
import LoadingButton from "../LoadingButton"

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
  tat: string
  assignedDate: string
  workNotes: string
}

const dummyTechnicians = [
  { name: "John Smith", phone: "+1-555-0101" },
  { name: "Mike Johnson", phone: "+1-555-0102" },
  { name: "Sarah Williams", phone: "+1-555-0103" },
]

// App Script URL and Sheet Info
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyICPXs4C-5VETMpsaIZS6ftSHDrXMfHu3n70Mi2_J7JvuNN7tHlK1xyrkDpiDM5HPD/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

export default function TechnicianAssignPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [formData, setFormData] = useState({
    technicianName: "",
    technicianPhone: "",
    tat: "",
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
      const assignmentsArray: Assignment[] = [];

      dataRows.forEach((row: any[], index: number) => {
        const actualRowIndex = index + 3;

        const indentNo = row[1] || ""; // Column B
        const machineName = row[2] || "";
        const department = row[3] || "";
        const problem = row[4] || "";
        const priority = row[5] || "Medium";
        const expectedDeliveryDate = row[6] ? formatDate(row[6]) : "";
        const imageLink = row[7] || "";
        const status = row[11] || ""; // Column L - status (approval status)
        const remarks = row[12] || ""; // Column M - remarks
        const technicianName = row[16] || ""; // Column Q - technician name
        const technicianPhone = row[17] || ""; // Column R - technician phone
        const assignedDate = row[18] ? formatDate(row[18]) : ""; // Column S - assigned date
        const workNotes = row[19] || ""; // Column T - work notes
        const tat = row[40] || ""; // Column AO - tat

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
            tat: "",
            assignedDate: "",
            workNotes: "",
          });
        }
        // Show in History tab if:
        // 1. Has indent number
        // 2. Is approved (status = "approved") in Column L
        // 3. Column Q (technician name) has a value
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
            tat,
            assignedDate,
            workNotes,
          });
        }
      });

      setAssignments(assignmentsArray);
      if (refreshing) toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateAssignmentInSheet = async (assignment: Assignment, formData: any) => {
    try {
      const currentDateTime = getFormattedDateTime();

      console.log(`Updating row ${assignment.rowIndex} for Indent No: ${assignment.indentNo}`);

      // We use updateCell specifically for each column to avoid overwriting the whole row
      // O=15, Q=17, R=18, S=19, T=20, U=21 (1-based indices)
      const updates = [
        { col: 15, val: currentDateTime },         // Column O - Actual Date
        { col: 17, val: formData.technicianName },  // Column Q - Technician Name
        { col: 18, val: formData.technicianPhone }, // Column R - Phone
        { col: 19, val: formData.assignedDate },    // Column S - Assigned Date
        { col: 20, val: formData.workNotes },       // Column T - Work Notes
        { col: 21, val: currentDateTime }          // Column U - Planned Date
      ];

      // Perform updates concurrently
      const results = await Promise.all(updates.map(u =>
        fetch(APP_SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "updateCell",
            sheetName: SHEET_NAME,
            rowIndex: assignment.rowIndex.toString(),
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
      tat: "",
      assignedDate: new Date().toISOString().split("T")[0],
      workNotes: "",
    });
    setShowModal(true);
  }

  const handleConfirmAssign = async () => {
    if (selectedAssignment) {
      setAssigning(true);
      try {
        const success = await updateAssignmentInSheet(selectedAssignment, formData);

        if (success) {
          // Update local state
          const updatedAssignments = assignments.map((a) =>
            a.id === selectedAssignment.id
              ? {
                ...a,
                technicianName: formData.technicianName,
                technicianPhone: formData.technicianPhone,
                tat: formData.tat,
                assignedDate: formData.assignedDate,
                workNotes: formData.workNotes,
                status: "assigned" as const,
              }
              : a,
          );
          setAssignments(updatedAssignments);
          toast.success("Technician assigned successfully");
        } else {
          toast.error("Failed to assign technician");
        }

        setShowModal(false);
        setSelectedAssignment(null);

        setTimeout(() => {
          fetchSheetData(true);
        }, 1000);
      } catch (error) {
        console.error("Error in handleConfirmAssign:", error);
        toast.error("An unexpected error occurred during technician assignment.");
      } finally {
        setAssigning(false);
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
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Department</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Priority</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Expected Delivery</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Image</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Problem</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pendingAssignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{assignment.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{assignment.machineName}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{assignment.department}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600 max-w-xs truncate">{assignment.problem}</td>
              <td className="px-6 py-5">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block transform transition-transform group-hover:scale-105 duration-300 ${assignment.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : assignment.priority === "Medium"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-teal-100 text-teal-700"
                    }`}
                >
                  {assignment.priority}
                </span>
              </td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">
                {assignment.expectedDeliveryDate || "—"}
              </td>
              <td className="px-6 py-5">
                {assignment.imageLink ? (
                  <a
                    href={assignment.imageLink}
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
              <td className="px-6 py-5 text-sm font-medium text-slate-500 italic max-w-xs truncate">{assignment.remarks || "—"}</td>
              <td className="px-6 py-5">
                <button
                  onClick={() => handleAssignClick(assignment)}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-teal-100"
                >
                  Assign
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingAssignments.length === 0 && !loading && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-[24px] flex items-center justify-center opacity-40">
            <RefreshCw className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Queue Clear</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">No pending technician assignments at this moment</p>
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
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Department</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Problem</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Technician</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">TAT</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Assigned</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Work Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {historyAssignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{assignment.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{assignment.machineName}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{assignment.department}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600 max-w-xs truncate">{assignment.problem}</td>
              <td className="px-6 py-5">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">{assignment.technicianName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{assignment.technicianPhone}</p>
                </div>
              </td>
              <td className="px-6 py-5 text-sm font-black text-teal-600">{assignment.tat}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">{assignment.assignedDate}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 italic max-w-xs truncate">{assignment.workNotes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyAssignments.length === 0 && !loading && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-[24px] flex items-center justify-center opacity-40">
            <ImageIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">History Silent</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Assignment history will manifest here over time</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="border-l-4 border-teal-500 pl-4">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-1">Technician Assignment</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">Assign skilled personnel to maintenance requests</p>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                Pending ({pendingAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-bold text-xs uppercase tracking-[0.2em] transition-all rounded-[24px] ${activeTab === "history"
                  ? "text-teal-600 bg-white shadow-sm ring-1 ring-teal-100"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeTab === "history" ? "bg-teal-500" : "bg-slate-300"}`} />
                History ({historyAssignments.length})
              </button>
            </div>

            <div className="p-2">
              {activeTab === "pending" ? <PendingTable /> : <HistoryTable />}
            </div>
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

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50 transition"
              disabled={assigning}
            >
              Cancel
            </button>
            <LoadingButton
              onClick={handleConfirmAssign}
              isLoading={assigning}
              loadingText="Assigning..."
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition shadow-md"
            >
              Assign Technician
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}