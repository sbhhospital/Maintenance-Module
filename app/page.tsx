"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Lock, Mail, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"

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
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-cyan-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">Maintenance</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black block">Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-600 rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-black block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-600 rounded-lg text-black placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-2.5 rounded-lg transition duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              Use your username and password from the Master sheet
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}