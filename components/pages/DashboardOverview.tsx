"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import StatCard from "../StatCard"
import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"

const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"

const COLORS = ["#3b82f6", "#06b6d4", "#f97316", "#ef4444"]

interface DashboardData {
  totalIndents: number
  pendingApprovals: number
  approved: number
  completed: number
  barData: Array<{ name: string; value: number }>
  lineData: Array<{ name: string; completed: number; pending: number }>
  pieData: Array<{ name: string; value: number }>
  workInProgress: number
  inspected: number
  paymentDone: number
}

// Mock data for fallback
const mockData: DashboardData = {
  totalIndents: 120,
  pendingApprovals: 35,
  approved: 45,
  completed: 42,
  barData: [
    { name: "Total", value: 120 },
    { name: "Pending", value: 35 },
    { name: "Approved", value: 45 },
    { name: "Assigned", value: 25 },
  ],
  lineData: [
    { name: "Jan 2025", completed: 12, pending: 8 },
    { name: "Feb 2025", completed: 19, pending: 12 },
    { name: "Mar 2025", completed: 25, pending: 10 },
    { name: "Apr 2025", completed: 28, pending: 15 },
    { name: "May 2025", completed: 35, pending: 8 },
    { name: "Jun 2025", completed: 42, pending: 6 },
  ],
  pieData: [
    { name: "Completed", value: 42 },
    { name: "In Progress", value: 28 },
    { name: "Pending", value: 20 },
  ],
  workInProgress: 28,
  inspected: 36,
  paymentDone: 42,
}

// Helper: format month label "Mon YYYY"
function formatMonthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" })
}

// Helper: get YYYY-MM key
function monthKey(date: Date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  return `${y}-${m.toString().padStart(2, "0")}`
}

// Function to parse DD/MM/YYYY HH:MM:SS date strings
function parseDateString(dateStr: string | number): Date | null {
  try {
    if (!dateStr) return null

    let str = String(dateStr)

    // If it's already a timestamp number
    if (typeof dateStr === 'number') {
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    }

    // Try parsing DD/MM/YYYY HH:MM:SS format
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/)

    if (match) {
      const day = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1 // JavaScript months are 0-indexed
      const year = parseInt(match[3], 10)
      const hour = parseInt(match[4], 10)
      const minute = parseInt(match[5], 10)
      const second = parseInt(match[6], 10)

      const date = new Date(year, month, day, hour, minute, second)
      return isNaN(date.getTime()) ? null : date
    }

    // Try other date formats as fallback
    const date = new Date(str)
    return isNaN(date.getTime()) ? null : date

  } catch (error) {
    console.error("Error parsing date:", dateStr, error)
    return null
  }
}

// Function to fetch and process sheet data
async function fetchSheetData(): Promise<DashboardData> {
  try {
    // First, fetch all data from the sheet (gviz)
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const text = await response.text()
    const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
    const data = JSON.parse(jsonText)

    // Process the rows (gviz format: data.table.rows)
    const rows = ((data.table && data.table.rows) || []).slice(1);

    // Calculate stats
    let totalIndents = 0
    let pendingApprovals = 0
    let approved = 0
    let completed = 0
    let workInProgress = 0
    let inspected = 0
    let paymentDone = 0

    // For trend analysis - collect date -> counts
    const monthCounts: { [key: string]: { completed: number; pending: number } } = {}
    const allDates: Date[] = [] // Track all valid dates to find max date

    rows.forEach((row: any) => {
      const cells = row.c

      // Skip completely empty rows
      if (!cells || cells.length === 0) return

      // Count total indents (Column A)
      if (cells[0] && (cells[0].v || cells[0].f)) {
        totalIndents++
      }

      // Determine rejection flag from Column L (index 11)
      let isRejected = false
      let isApproved = false
      const statusCell = cells[11];
      const statusValue = statusCell ? statusCell.v : null;

      if (statusValue) {
        const status = String(statusValue).trim().toLowerCase()
        if (status === "approved") {
          approved++
          isApproved = true
        } else if (status === "rejected") {
          isRejected = true
          pendingApprovals++
        } else {
          pendingApprovals++
        }
      } else {
        // Null or empty value -> Pending
        pendingApprovals++
      }

      // Completion status Column AE (index 30)
      let isCompleted = false
      if (cells[30] && cells[30].v) {
        const completionStatus = String(cells[30].v).trim().toLowerCase()
        if (completionStatus === "done" || completionStatus === "completed") {
          completed++
          isCompleted = true
          inspected++
        } else if (!isRejected) {
          workInProgress++
        }
      } else if (!isRejected) {
        // If column AE missing or empty and not rejected => work in progress
        workInProgress++
      }

      // Payment status Column AH (index 33)
      if (cells[33] && cells[33].v) {
        paymentDone++
      }

      // Parse date from Column A (index 0)
      let dateValue = null
      if (cells[0] && cells[0].v) {
        dateValue = cells[0].v
      } else if (cells[0] && cells[0].f) {
        // Sometimes gviz uses formatted value (string)
        dateValue = cells[0].f
      }

      if (dateValue) {
        const parsedDate = parseDateString(dateValue)

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          allDates.push(parsedDate)

          const key = monthKey(parsedDate)
          if (!monthCounts[key]) {
            monthCounts[key] = { completed: 0, pending: 0 }
          }

          // Count completed vs pending for this month
          if (isCompleted) {
            monthCounts[key].completed += 1
          } else {
            // Count as pending (includes rejected, pending approval, in progress, etc.)
            monthCounts[key].pending += 1
          }
        }
      }
    })

    // Assigned derived
    const assigned = totalIndents - pendingApprovals - approved

    // Bar data
    const barData = [
      { name: "Total", value: totalIndents },
      { name: "Pending", value: pendingApprovals },
      { name: "Approved", value: approved },
      { name: "Assigned", value: Math.max(0, assigned) },
    ]

    // Pie data
    const pieData = [
      { name: "Completed", value: completed },
      { name: "In Progress", value: Math.max(0, approved - completed) },
      { name: "Pending", value: pendingApprovals },
    ]

    // Generate last 6 months dynamically
    let referenceDate = new Date()

    // If we have dates in the sheet, use the latest date as reference
    if (allDates.length > 0) {
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
      referenceDate = maxDate
    }

    // Create array for the last 6 months (including current month)
    const lineData = []

    for (let i = 5; i >= 0; i--) {
      // Create date for month (i months ago)
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1)
      const key = monthKey(date)
      const label = formatMonthLabel(date)

      // Get counts for this month or default to 0
      const counts = monthCounts[key] || { completed: 0, pending: 0 }

      lineData.push({
        name: label,
        completed: counts.completed,
        pending: counts.pending,
      })
    }

    return {
      totalIndents,
      pendingApprovals,
      approved,
      completed,
      barData,
      lineData,
      pieData,
      workInProgress,
      inspected,
      paymentDone,
    }
  } catch (error) {
    console.error("Error fetching sheet data:", error)
    // Return mock data if fetch fails
    return mockData
  }
}

export default function DashboardOverview() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(mockData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchSheetData()
        setDashboardData(data)
      } catch (err) {
        setError("Failed to load dashboard data. Using sample data.")
        console.error("Error loading dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Refresh data every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Maintenance Management Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Indents"
          value={dashboardData.totalIndents}
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Pending Approvals"
          value={dashboardData.pendingApprovals}
          icon={AlertCircle}
          color="orange"
          loading={loading}
        />
        <StatCard
          title="Approved"
          value={dashboardData.approved}
          icon={CheckCircle}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Completed"
          value={dashboardData.completed}
          icon={Clock}
          color="cyan"
          loading={loading}
        />
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-600 mt-2">Loading dashboard data...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-orange-700">{error}</p>
        </div>
      )}

      {/* Charts Grid */}
      {!loading && (
        <>
          {/* Line Chart */}
          {/* <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Trend Analysis (Last 6 Months)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ fill: "#3b82f6" }} 
                  name="Completed"
                />
                <Line 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#f97316" 
                  strokeWidth={2} 
                  dot={{ fill: "#f97316" }} 
                  name="Pending"
                />
              </LineChart>
            </ResponsiveContainer>
          </div> */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Indent Status Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Work Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, "Count"]}
                    contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
              <p className="text-slate-600 text-sm mb-2">Work In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{dashboardData.workInProgress}</p>
              <p className="text-xs text-slate-600 mt-2">Active assignments</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
              <p className="text-slate-600 text-sm mb-2">Inspected</p>
              <p className="text-3xl font-bold text-orange-600">{dashboardData.inspected}</p>
              <p className="text-xs text-slate-600 mt-2">Ready for payment</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <p className="text-slate-600 text-sm mb-2">Payment Done</p>
              <p className="text-3xl font-bold text-green-600">{dashboardData.paymentDone}</p>
              <p className="text-xs text-slate-600 mt-2">Completed records</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}