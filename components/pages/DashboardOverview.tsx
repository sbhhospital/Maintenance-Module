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
import { TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import LoadingButton from "../LoadingButton"
import { toast } from "sonner"

const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyICPXs4C-5VETMpsaIZS6ftSHDrXMfHu3n70Mi2_J7JvuNN7tHlK1xyrkDpiDM5HPD/exec"

const COLORS = ["#1DB9A6", "#0ea5e9", "#f59e0b", "#10b981"]

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
    const response = await fetch(`${APP_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success || !Array.isArray(result.data)) {
      console.error("Invalid response format:", result);
      throw new Error(result.error || "Failed to fetch data array");
    }

    const data = result.data;

    // The data is a 2D array: [ [header], [row2], [row3], ... ]
    const rows = data.slice(2);


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

    rows.forEach((row: any[]) => {
      // Skip completely empty rows
      if (!row || row.length === 0) return

      // Count total indents (Column A - index 0)
      if (row[0]) {
        totalIndents++
      }

      // Determine rejection flag from Column L (index 11)
      let isRejected = false
      let isApproved = false
      const statusValue = row[11];

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
      if (row[30]) {
        const completionStatus = String(row[30]).trim().toLowerCase()
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
      if (row[33]) {
        paymentDone++
      }

      // Parse date from Column A (index 0)
      const dateValue = row[0]

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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      const data = await fetchSheetData()
      setDashboardData(data)
      toast.success("Dashboard data refreshed")
    } catch (err) {
      toast.error("Failed to refresh dashboard data")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchSheetData()
        setDashboardData(data)
      } catch (err) {
        setError("Failed to load dashboard data. Using sample data.")
        toast.error("Failed to fetch dashboard data")
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
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="border-l-4 border-teal-500 pl-4">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-1">Performance Overview</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">Real-time maintenance metrics and trends</p>
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
        <div className="bg-white rounded-[32px] shadow-premium border border-teal-50 p-12 text-center animate-in zoom-in-95 duration-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-4">Analyzing Data...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-orange-700">{error}</p>
        </div>
      )}

      {/* Charts Grid */}
      {!loading && (
        <div className="space-y-8 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div className="bg-white rounded-[32px] shadow-soft border border-teal-50 p-8 hover:shadow-premium transition-shadow duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800">Indent Analytics</h2>
                <div className="bg-teal-50 px-3 py-1 rounded-full text-[10px] font-bold text-teal-600 uppercase tracking-widest">Monthly Growth</div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dashboardData.barData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1DB9A6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #f1f5f9",
                      borderRadius: "16px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                  />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-[32px] shadow-soft border border-teal-50 p-8 hover:shadow-premium transition-shadow duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800">Status Distribution</h2>
                <div className="bg-teal-50 px-3 py-1 rounded-full text-[10px] font-bold text-teal-600 uppercase tracking-widest">Real-time</div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={dashboardData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dashboardData.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #f1f5f9",
                      borderRadius: "16px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      fontSize: "12px"
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: "600" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-4">
            <div className="bg-linear-to-br from-teal-50 to-white rounded-[32px] p-8 border border-teal-100 shadow-soft relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-100/30 rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Work In Progress</p>
              <p className="text-4xl font-black text-teal-600 relative z-10">{dashboardData.workInProgress}</p>
              <div className="mt-4 flex items-center gap-2 relative z-10">
                <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active now</span>
              </div>
            </div>

            <div className="bg-linear-to-br from-orange-50 to-white rounded-[32px] p-8 border border-orange-100 shadow-soft relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/30 rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Inspected</p>
              <p className="text-4xl font-black text-orange-600 relative z-10">{dashboardData.inspected}</p>
              <div className="mt-4 flex items-center gap-2 relative z-10">
                <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Payment</span>
              </div>
            </div>

            <div className="bg-linear-to-br from-emerald-50 to-white rounded-[32px] p-8 border border-emerald-100 shadow-soft relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/30 rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Verified & Paid</p>
              <p className="text-4xl font-black text-emerald-600 relative z-10">{dashboardData.paymentDone}</p>
              <div className="mt-4 flex items-center gap-2 relative z-10">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Successful Completion</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}