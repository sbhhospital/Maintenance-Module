"use client"

import { useState, useEffect } from "react"
import { Upload, Image as ImageIcon, RefreshCw } from "lucide-react"
import Modal from "../Modal"
import { toast } from "sonner"
import LoadingButton from "../LoadingButton"

interface PaymentItem {
  id: string
  indentNo: string
  machineName: string
  inspectedBy: string
  inspectionDate: string
  tat: string
  remarks: string
  imageLink: string
  billNo: string
  amount: string
  paymentDate: string
  billImageUrl: string
  status: "pending" | "paid"
  rowIndex: number
}

// App Script URL and Sheet Info
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyICPXs4C-5VETMpsaIZS6ftSHDrXMfHu3n70Mi2_J7JvuNN7tHlK1xyrkDpiDM5HPD/exec"
const SHEET_ID = "15qpPqAKBH-IwxVkzG1UC-Fc3rZLUUXIqPjEqp_MVin4"
const SHEET_NAME = "SBH Maintenance"
const DRIVE_FOLDER_ID = "1vjR1S3rdtjCpUKyVEsWALATkzqOzO5qh"

export default function PaymentPage() {
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    billNo: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    billImage: null as File | null,
    billImageUrl: "",
  })

  const pendingItems = paymentItems.filter((item) => item.status === "pending")
  const historyItems = paymentItems.filter((item) => item.status === "paid")

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

        // Handle dd/mm/yyyy format
        if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          return dateValue;
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

  const formatDateForSheet = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date for sheet:", error);
      return dateString;
    }
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
      const paymentItemsArray: PaymentItem[] = [];

      dataRows.forEach((row: any[], index: number) => {
        const actualRowIndex = index + 3;

        const indentNo = row[1] || ""; // Column B
        const machineName = row[2] || ""; // Column C
        const imageLink = row[7] || ""; // Column H
        const inspectedBy = row[28] || ""; // Column AC
        const inspectionDate = row[29] ? formatDate(row[29]) : ""; // Column AD
        const inspectionResult = row[30] || ""; // Column AE
        const remarks = row[31] || ""; // Column AF
        const billNo = row[35] || ""; // Column AJ
        const amount = row[36] || ""; // Column AK
        const paymentDate = row[37] ? formatDate(row[37]) : ""; // Column AL
        const billImageUrl = row[38] || ""; // Column AM
        const tat = row[39] || ""; // Column AN

        if (indentNo && inspectionResult === "Done") {
          if (!billNo || billNo === "") {
            paymentItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              inspectedBy,
              inspectionDate,
              tat,
              remarks,
              imageLink,
              billNo,
              amount,
              paymentDate,
              billImageUrl,
              status: "pending",
              rowIndex: actualRowIndex,
            });
          } else {
            paymentItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              inspectedBy,
              inspectionDate,
              tat,
              remarks,
              imageLink,
              billNo,
              amount,
              paymentDate,
              billImageUrl,
              status: "paid",
              rowIndex: actualRowIndex,
            });
          }
        }
      });

      setPaymentItems(paymentItemsArray);
      if (refreshing) toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const uploadBillImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;

            console.log('Uploading bill image to Drive...', {
              fileName: file.name,
              mimeType: file.type,
              fileSize: file.size
            });

            // Create form data with URLSearchParams instead of FormData to avoid CORS issues
            const params = new URLSearchParams();
            params.append('action', 'uploadFile');
            params.append('base64Data', base64Data.split(',')[1]); // Remove data URL prefix
            params.append('fileName', `bill_${Date.now()}_${file.name}`);
            params.append('mimeType', file.type);
            params.append('folderId', DRIVE_FOLDER_ID);

            // Add timestamp to prevent caching
            const timestamp = Date.now();
            const urlWithCacheBust = `${APP_SCRIPT_URL}?t=${timestamp}`;

            // Do NOT use no-cors — we need to read the response to get the real Drive file URL
            const response = await fetch(urlWithCacheBust, {
              method: "POST",
              body: params,
            });

            const result = await response.json();
            setUploadingImage(false);

            if (result.success && result.fileUrl) {
              console.log('Image uploaded successfully, URL:', result.fileUrl);
              resolve(result.fileUrl);
            } else {
              console.error('Upload response error:', result);
              resolve(null);
            }

          } catch (error) {
            console.error('Error uploading image:', error);
            setUploadingImage(false);
            resolve(null);
          }
        };

        reader.onerror = () => {
          console.error('FileReader error');
          setUploadingImage(false);
          resolve(null);
        };

        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error in uploadBillImage:', error);
      setUploadingImage(false);
      return null;
    }
  };

  const updatePaymentInSheet = async (paymentItem: PaymentItem, formData: any, billImageUrl: string = "") => {
    try {
      const now = new Date();
      const actualValue = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      console.log(`Updating row ${paymentItem.rowIndex} for Indent No: ${paymentItem.indentNo}`);

      // AH=34, AJ=36, AK=37, AL=38, AM=39, AN=40 (1-based indices)
      const updates = [
        { col: 34, val: actualValue },                              // Column AH - Paid Date
        { col: 36, val: formData.billNo },                          // Column AJ - Bill No
        { col: 37, val: formData.amount },                          // Column AK - Amount
        { col: 38, val: formatDateForSheet(formData.paymentDate) },  // Column AL - Payment Date
        { col: 39, val: billImageUrl || "" },                        // Column AM - Bill Image URL
      ];

      const results = await Promise.all(updates.map(u =>
        fetch(APP_SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "updateCell",
            sheetName: SHEET_NAME,
            rowIndex: paymentItem.rowIndex.toString(),
            columnIndex: u.col.toString(),
            value: u.val
          })
        }).then(r => r.json())
      ));

      const allSuccessful = results.every(r => r.success);
      if (!allSuccessful) console.error("Some updates failed:", results);
      return allSuccessful;
    } catch (error) {
      console.error("Error updating payment:", error);
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

  const handlePaymentClick = (item: PaymentItem) => {
    setSelectedItem(item);
    setFormData({
      billNo: item.billNo || "",
      amount: item.amount || "",
      paymentDate: new Date().toISOString().split("T")[0],
      billImage: null,
      billImageUrl: item.billImageUrl || "",
    });
    setShowModal(true);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, billImage: file }));
    }
  };

  const handleConfirmPayment = async () => {
    if (selectedItem && formData.billNo && formData.amount) {
      setProcessing(true);
      try {
        let billImageUrl = formData.billImageUrl;

        // Upload bill image if selected
        if (formData.billImage) {
          try {
            billImageUrl = (await uploadBillImage(formData.billImage)) || "";
            if (billImageUrl) {
              toast.success("Bill image uploaded successfully");
            } else {
              toast.error("Failed to upload bill image");
            }
          } catch (error) {
            console.error("Failed to upload bill image:", error);
            toast.error("Error uploading bill image");
            // Continue without image if upload fails
          }
        }

        const success = await updatePaymentInSheet(selectedItem, formData, billImageUrl);

        if (success) {
          // Update local state
          const updatedItems = paymentItems.map((item) =>
            item.id === selectedItem.id
              ? {
                ...item,
                billNo: formData.billNo,
                amount: formData.amount,
                paymentDate: formData.paymentDate,
                billImageUrl: billImageUrl,
                status: "paid" as const,
              }
              : item,
          );
          setPaymentItems(updatedItems);
          toast.success("Payment processed successfully");
        } else {
          toast.error("Failed to process payment");
        }

        setShowModal(false);
        setSelectedItem(null);

        setTimeout(() => {
          fetchSheetData(true);
        }, 1500);
      } catch (error) {
        console.error("Error in handleConfirmPayment:", error);
        toast.error("An unexpected error occurred during payment processing.");
      } finally {
        setProcessing(false);
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
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Inspected By</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Date</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Remarks</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Image</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pendingItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{item.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.machineName}</td>
              <td className="px-6 py-5 text-sm font-bold text-slate-700">{item.inspectedBy}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">{item.inspectionDate}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 italic max-w-xs truncate">{item.remarks}</td>
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
                  onClick={() => handlePaymentClick(item)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-emerald-100"
                >
                  Process
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Accounts Clear</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">No pending payments to process</p>
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
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Bill No</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Amount</th>
            <th className="px-6 py-4 text-left text-[10px) font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Date</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">TAT</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-teal-700 uppercase tracking-widest whitespace-nowrap">Doc</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
              <td className="px-6 py-5 text-sm font-black text-slate-800">{item.indentNo}</td>
              <td className="px-6 py-5 text-sm font-medium text-slate-600">{item.machineName}</td>
              <td className="px-6 py-5 text-sm font-bold text-slate-700">{item.billNo}</td>
              <td className="px-6 py-5">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-100">
                  ₹{item.amount}
                </span>
              </td>
              <td className="px-6 py-5 text-sm font-medium text-slate-500 whitespace-nowrap">{item.paymentDate}</td>
              <td className="px-6 py-5 text-sm font-black text-teal-600">{item.tat} Days</td>
              <td className="px-6 py-5">
                {item.billImageUrl ? (
                  <a
                    href={item.billImageUrl}
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
            <p className="text-[10px] text-slate-400 font-medium mt-1">Payment records will appear here as they are fulfilled</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="border-l-4 border-teal-500 pl-4">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-1">Payment Management</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">Financial settlement for maintenance operations</p>
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
                Pending ({pendingItems.length})
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Process Payment">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Indent No: <span className="font-semibold text-slate-900">{selectedItem?.indentNo}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Machine: <span className="font-semibold text-slate-900">{selectedItem?.machineName}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Inspected By: <span className="font-semibold text-slate-900">{selectedItem?.inspectedBy}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Inspection Date: <span className="font-semibold text-slate-900">{selectedItem?.inspectionDate}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Remarks: <span className="font-semibold text-slate-900">{selectedItem?.remarks}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bill Number *</label>
            <input
              type="text"
              value={formData.billNo}
              onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
              placeholder="Enter bill number"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Total Bill Amount *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Date *</label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Bill Image</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">
                {formData.billImage
                  ? `Selected: ${formData.billImage.name}`
                  : "Click or drag bill image here"
                }
              </p>
              {uploadingImage && (
                <p className="text-xs text-blue-600 mt-2">Uploading image...</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium hover:bg-slate-50 transition"
              disabled={processing || uploadingImage}
            >
              Cancel
            </button>
            <LoadingButton
              onClick={handleConfirmPayment}
              isLoading={processing || uploadingImage}
              loadingText={uploadingImage ? "Uploading Image..." : "Processing..."}
              disabled={!formData.billNo || !formData.amount}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition shadow-md"
            >
              Process Payment
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}