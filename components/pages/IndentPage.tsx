import React, { useState } from "react"
import { Plus, Upload, FileText } from "lucide-react"
import { toast } from "sonner"
import LoadingButton from "../LoadingButton"

interface Indent {
  id: string
  indentNo: string
  machineName: string
  department: string
  problem: string
  priority: string
  expectedDays: number
  image: string
}

const dummyDepartments = ["Production", "Maintenance", "Quality", "Logistics", "IT"]
const dummyPriorities = ["High", "Medium", "Low"]

// Google Apps Script URL - Use /exec endpoint
// Google Apps Script URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyICPXs4C-5VETMpsaIZS6ftSHDrXMfHu3n70Mi2_J7JvuNN7tHlK1xyrkDpiDM5HPD/exec'

export default function IndentPage() {
  const [indents, setIndents] = useState<Indent[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")

  const [formData, setFormData] = useState({
    machineName: "",
    department: dummyDepartments[0],
    problem: "",
    priority: dummyPriorities[1],
    expectedDays: 1,
    date: "",
    image: "",
  })

  const uploadImageToDrive = async (file: File): Promise<string | null> => {
    try {
      setUploadProgress("Reading image file...")

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string
            setUploadProgress("Uploading to Google Drive...")

            console.log('Uploading image to Drive...', {
              fileName: file.name,
              mimeType: file.type,
              fileSize: file.size
            })

            // Create form data with URLSearchParams instead of FormData to avoid CORS issues
            const params = new URLSearchParams()
            params.append('action', 'uploadFile')
            params.append('base64Data', base64Data.split(',')[1]) // Remove data URL prefix
            params.append('fileName', `indent_${Date.now()}_${file.name}`)
            params.append('mimeType', file.type)
            params.append('folderId', '1vjR1S3rdtjCpUKyVEsWALATkzqOzO5qh')

            // Add timestamp to prevent caching
            const timestamp = Date.now()
            const urlWithCacheBust = `${GAS_URL}?t=${timestamp}`

            const response = await fetch(urlWithCacheBust, {
              method: "POST",
              body: params,
            })

            const result = await response.json()

            if (result.success && result.fileUrl) {
              setUploadProgress("Image uploaded successfully!")
              console.log('Image upload successful:', result.fileUrl)
              resolve(result.fileUrl)
            } else {
              console.error('Upload response error:', result)
              setUploadProgress("Image upload failed.")
              resolve(null)
            }

          } catch (error) {
            console.error('Error uploading image:', error)
            setUploadProgress(`Image upload error: ${error}`)
            resolve(null)
          }
        }

        reader.onerror = () => {
          console.error('FileReader error')
          setUploadProgress("Error reading file")
          resolve(null)
        }

        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Error in uploadImageToDrive:', error)
      setUploadProgress("Upload process failed")
      return null
    }
  }

  const submitToGoogleSheet = async (rowData: any[]): Promise<boolean> => {
    try {
      const params = new URLSearchParams()
      params.append('action', 'insert')
      params.append('sheetName', 'SBH Maintenance')
      params.append('rowData', JSON.stringify(rowData))

      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const urlWithCacheBust = `${GAS_URL}?t=${timestamp}`

      console.log('Submitting to sheet:', rowData)

      const response = await fetch(urlWithCacheBust, {
        method: 'POST',
        body: params, // Use URLSearchParams
      })

      const result = await response.json()

      if (result.success) {
        console.log('Sheet submission successful')
        return true
      } else {
        console.error('Sheet submission error:', result)
        return false
      }

    } catch (error) {
      console.error('Error submitting to sheet:', error)
      return false
    }
  }

  // In your React code, replace the handleAddIndent function:

  const handleAddIndent = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!formData.machineName || !formData.problem) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    setUploadProgress("")

    try {
      let finalImageUrl = ""
      const fileInput = document.getElementById('imageUpload') as HTMLInputElement

      // Step 1: Upload Image if selected
      if (fileInput?.files?.[0]) {
        const file = fileInput.files[0]

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image size should be less than 5MB")
          setLoading(false)
          return
        }

        setUploadProgress("Uploading image...")
        const uploadedUrl = await uploadImageToDrive(file)
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl
          setUploadProgress("Image uploaded successfully!")
        } else {
          // If confirm is needed, we'll keep it for now but maybe wrap in a better UI later
          const proceed = confirm("Image upload failed. Do you want to submit the indent without an image?")
          if (!proceed) {
            setLoading(false)
            return
          }
        }
      }

      // Step 2: Prepare and Submit Data
      const now = new Date()
      const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      // Get planned date (same as timestamp for creation)
      const plannedDateFormatted = timestamp;

      // Prepare row data according to sheet mapping
      // Column A: Timestamp
      // Column B: Indent No (calculated by script)
      // Column C: Equipment Name
      // Column D: Department
      // Column E: Problem
      // Column F: Priority
      // Column G: Date (Selected date)
      // Column H: Image URL
      // Column I: Planned Date
      const rowData = [
        timestamp,
        "", // Indent No placeholder
        formData.machineName,
        formData.department,
        formData.problem,
        formData.priority,
        formData.date, // Selected date
        finalImageUrl, // Column H - Image URL
        plannedDateFormatted // Column I - Planned Date
      ]

      setUploadProgress("Submitting to sheet...")
      const success = await submitToGoogleSheet(rowData)

      if (success) {
        // Create new indent for local state
        const newIndent: Indent = {
          id: Date.now().toString(),
          indentNo: "Pending...",
          machineName: formData.machineName,
          department: formData.department,
          problem: formData.problem,
          priority: formData.priority,
          expectedDays: formData.expectedDays,
          image: finalImageUrl,
        }

        setIndents([newIndent, ...indents])

        // Reset form
        setFormData({
          machineName: "",
          department: dummyDepartments[0],
          problem: "",
          priority: dummyPriorities[1],
          expectedDays: 1,
          date: "",
          image: "",
        })

        // Reset file input
        if (fileInput) fileInput.value = ""
        toast.success("Indent submitted successfully!")
      } else {
        toast.error("Failed to submit indent data.")
      }

    } catch (error) {
      console.error('Error in handleAddIndent:', error)
      toast.error("An error occurred during submission.")
    } finally {
      setLoading(false)
      setUploadProgress("")
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, image: URL.createObjectURL(file) })
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Create Indent</h1>
        <p className="text-slate-500 font-medium tracking-wide border-l-4 border-teal-500 pl-4">Submit a new maintenance request with equipment details</p>
      </div>

      <div className="bg-white rounded-[32px] shadow-soft border border-teal-50 p-8 hover:shadow-premium transition-all duration-500">
        <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-xl">
            <FileText className="w-6 h-6 text-teal-600" />
          </div>
          Equipment Information
        </h2>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Equipment Name *</label>
              <input
                type="text"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                placeholder="Enter Equipment name"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium appearance-none cursor-pointer"
              >
                {dummyDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Priority *</label>
              <div className="grid grid-cols-3 gap-3">
                {dummyPriorities.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all ${formData.priority === priority
                      ? (priority === 'High' ? 'bg-red-500 text-white shadow-md shadow-red-200' :
                        priority === 'Medium' ? 'bg-orange-500 text-white shadow-md shadow-orange-200' :
                          'bg-teal-500 text-white shadow-md shadow-teal-200')
                      : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Expected Delivery</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-medium cursor-pointer"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Problem Description *</label>
              <textarea
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                placeholder="Describe the maintenance issue in detail..."
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all placeholder:text-slate-400 font-medium resize-none"
                required
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Evidence Photo</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="imageUpload"
                    className="group relative border-2 border-dashed border-slate-200 rounded-[24px] p-8 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all block overflow-hidden"
                  >
                    <div className="relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
                      <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-teal-600" />
                      </div>
                      <p className="text-slate-600 font-bold text-sm">Tap to upload equipment photo</p>
                      <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest">Supports JPG, PNG (Max 5MB)</p>
                    </div>
                    <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors" />
                  </label>

                  {uploadProgress && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${uploadProgress.includes("success") ? "bg-green-500" : "bg-teal-500"}`} />
                      <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500">
                        {uploadProgress}
                      </p>
                    </div>
                  )}
                </div>

                <div className="h-full">
                  {formData.image ? (
                    <div className="relative h-full min-h-[160px] rounded-[24px] overflow-hidden border border-slate-100 group shadow-sm bg-slate-50">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-bottom p-4">
                        <span className="text-[10px] text-white font-bold uppercase tracking-widest self-end">Live Preview</span>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, image: "" })}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-sm hover:bg-white"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="h-full min-h-[160px] rounded-[24px] bg-slate-50 border border-slate-100 border-dashed flex flex-col items-center justify-center text-slate-300">
                      <FileText className="w-12 h-12 mb-2 opacity-20" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">No preview available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
            <LoadingButton
              onClick={handleAddIndent}
              isLoading={loading}
              loadingText="Creating Request..."
              className="w-full sm:w-auto bg-linear-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-bold py-5 px-10 rounded-[20px] shadow-lg shadow-teal-200 transition-all text-sm uppercase tracking-widest"
              icon={<Plus className="w-5 h-5 mr-1" />}
            >
              Confirm Submission
            </LoadingButton>

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">System is processing</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}