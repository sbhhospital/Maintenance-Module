"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Lock, Mail, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"
import LoadingButton from "../components/LoadingButton"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [userName, setUserName] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Restore login state from localStorage on component mount
    const storedLoginState = localStorage.getItem("maintenance_login_state")
    if (storedLoginState) {
      try {
        const { isLoggedIn: savedIsLoggedIn } = JSON.parse(storedLoginState)
        if (savedIsLoggedIn) {
          router.push("/dashboard")
          return
        }
      } catch (error) {
        console.error("Failed to restore login state:", error)
        localStorage.removeItem("maintenance_login_state")
      }
    }
    setIsHydrated(true)
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setIsLoading(true)

    if (!username || !password) {
      setLoginError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    try {
      // Fetch user data from Google Sheets
      const response = await fetch(`https://docs.google.com/spreadsheets/d/15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4/gviz/tq?tqx=out:json&sheet=Master`)

      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }

      const text = await response.text()
      const json = JSON.parse(text.substring(47).slice(0, -2))

      if (!json.table || !json.table.rows) {
        throw new Error("Invalid data format")
      }

      const rows = json.table.rows

      // Find matching user
      const user = rows.find((row: any) => {
        const userData = row.c
        return userData &&
          userData[0] && userData[0].v === username && // Column A - username
          userData[1] && userData[1].v === password    // Column B - password
      })

      if (user) {
        const userData = user.c
        const role = userData[3] ? userData[3].v : "user" // Column D - role
        const name = userData[2] ? userData[2].v : ""     // Column C - name

        setUserRole(role)
        setUserName(name)
        setIsLoggedIn(true)

        // Save login state to localStorage
        localStorage.setItem("maintenance_login_state", JSON.stringify({
          isLoggedIn: true,
          userRole: role,
          userName: name
        }))

        router.push("/dashboard")
      } else {
        setLoginError("Invalid username or password")
      }
    } catch (error) {
      console.error("Login error:", error)
      setLoginError("Failed to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isHydrated) {
    return null
  }



  return (
    <div className="min-h-screen bg-linear-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-100/40 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-100/40 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

      <div className="w-full max-w-[480px] relative z-10 transition-all duration-700 animate-in fade-in zoom-in-95">
        <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-premium border border-white p-10 md:p-14">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-linear-to-br from-teal-400 to-teal-600 mb-6 shadow-lg shadow-teal-200 transition-transform hover:rotate-12 duration-500">
              <Wrench className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">MedMaint</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">Precision Healthcare Systems</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Identity</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-teal-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[20px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-teal-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[20px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] text-red-500 text-xs font-bold animate-in slide-in-from-top-2">
                ⚠️ {loginError}
              </div>
            )}

            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Authorizing User..."
              className="w-full bg-linear-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-bold py-5 rounded-[20px] shadow-lg shadow-teal-200 transition-all text-sm uppercase tracking-widest mt-8"
            >
              System Login
            </LoadingButton>
          </form>

          <footer className="mt-12 text-center space-y-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Authorized Personnel Only
            </p>
            <div className="h-px w-12 bg-slate-100 mx-auto" />
            <p className="text-[9px] text-slate-300 font-medium">
              Care & Pulse Infrastructure © 2025
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}