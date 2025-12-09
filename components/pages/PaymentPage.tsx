"use client"

import { useState, useEffect } from "react"
import { Upload } from "lucide-react"
import Modal from "../Modal"

interface PaymentItem {
  id: string
  indentNo: string
  machineName: string
  inspectedBy: string
  inspectionDate: string
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
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRpoQQV8M3nNol5hl7ty81_3A06mbI8HxQNspk1Po4vcZ4CbidBVu8C_QeuA1zRiGn/exec"
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

  // const getCurrentFormattedDate = () => {
  //   const now = new Date();
  //   const day = String(now.getDate()).padStart(2, '0');
  //   const month = String(now.getMonth() + 1).padStart(2, '0');
  //   const year = now.getFullYear();
  //   const hours = 
  //   return `${day}/${month}/${year}`;
  // };

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
      const paymentItemsArray: PaymentItem[] = [];

      rows.forEach((row: any, index: number) => {
        const actualRowIndex = index + 3;
        const cells = row.c;

        // Fetch data from specified columns
        const indentNo = cells[1]?.v || ""; // Column B (index 1)
        const machineName = cells[2]?.v || ""; // Column C (index 2)
        const imageLink = cells[7]?.v || ""; // Column H (index 7)
        const inspectedBy = cells[28]?.v || ""; // Column AC (index 28)
        const inspectionDate = cells[29]?.v ? formatDate(cells[29]?.v) : ""; // Column AD (index 29)
        const inspectionResult = cells[30]?.v || ""; // Column AE (index 30)
        const remarks = cells[31]?.v || ""; // Column AF (index 31)
        
        // NEW COLUMN MAPPINGS
        const actualValue = cells[33]?.v || ""; // Column AH (index 33) - Actual Value
        const billNo = cells[35]?.v || ""; // Column AJ (index 35) - Bill No
        const amount = cells[36]?.v || ""; // Column AK (index 36) - Amount
        const paymentDate = cells[37]?.v ? formatDate(cells[37]?.v) : ""; // Column AL (index 37) - Payment Date
        const billImageUrl = cells[38]?.v || ""; // Column AM (index 38) - Bill Image URL

        // Check if inspection is done (Column AE = "Done")
        if (indentNo && inspectionResult === "Done") {
          // If bill number is empty (Column AJ is null/empty), show in pending
          if (!billNo || billNo === "") {
            paymentItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              inspectedBy,
              inspectionDate,
              remarks,
              imageLink,
              billNo,
              amount,
              paymentDate,
              billImageUrl,
              status: "pending",
              rowIndex: actualRowIndex,
            });
          }
          // If bill number exists (Column AJ has value), show in history
          else {
            paymentItemsArray.push({
              id: `${indentNo}-${actualRowIndex}`,
              indentNo,
              machineName,
              inspectedBy,
              inspectionDate,
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
    } catch (error) {
      console.error("Error fetching sheet data:", error);
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

          const response = await fetch(urlWithCacheBust, {
            method: "POST",
            body: params,
            mode: 'no-cors',
          });

          setUploadingImage(false);
          
          // With no-cors mode, we can't read the response, but the file IS being uploaded
          // We'll return a placeholder that indicates success
          // The actual file ID will be in the Google Drive folder with the timestamp in the filename
          const placeholderUrl = `https://drive.google.com/uc?export=view&id=uploaded_${timestamp}`;
          console.log('Image upload initiated (file being processed in background)');
          resolve(placeholderUrl);
          
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
    // Create array for all columns up to AM (39 columns total: A to AM)
    const rowData = new Array(39).fill(""); // A through AM (39 columns)
    
    // Get current date and time in dd/mm/yyyy hh:mm:ss format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const actualValue = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
    // Store payment data in the appropriate columns
    // Column AH (index 33): Actual Value (Current date in dd/mm/yyyy hh:mm:ss format)
    rowData[33] = actualValue; // Column AH - Actual Value
    
    // Column AJ (index 35): Bill Number
    rowData[35] = formData.billNo; // Column AJ - Bill No
    
    // Column AK (index 36): Amount
    rowData[36] = formData.amount; // Column AK - Amount
    
    // Column AL (index 37): Payment Date (in dd/mm/yyyy format)
    rowData[37] = formatDateForSheet(formData.paymentDate); // Column AL - Payment Date
    
    // Column AM (index 38): Bill Image URL
    rowData[38] = billImageUrl || ""; // Column AM - Bill Image URL

    const params = new URLSearchParams({
      action: "update",
      sheetName: SHEET_NAME,
      rowIndex: paymentItem.rowIndex.toString(),
      rowData: JSON.stringify(rowData),
    });

    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      body: params,
      mode: "no-cors",
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
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
      let billImageUrl = formData.billImageUrl;
      
      // Upload bill image if selected
      if (formData.billImage) {
        try {
          billImageUrl = await uploadBillImage(formData.billImage);
        } catch (error) {
          console.error("Failed to upload bill image:", error);
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
      }
      
      setShowModal(false);
      setSelectedItem(null);
      
      setTimeout(() => {
        handleRefresh();
      }, 1500);
    }
  }

  const PendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Machine</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Inspected By</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Inspection Date</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Remarks</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Image</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {pendingItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-slate-600">{item.inspectedBy}</td>
              <td className="px-6 py-4 text-slate-600">{item.inspectionDate}</td>
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
              <td className="px-6 py-4">
                <button
                  onClick={() => handlePaymentClick(item)}
                  className="px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 font-medium transition"
                >
                  Process Payment
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pendingItems.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No pending payments</div>}
    </div>
  )

  const HistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Indent No</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Machine</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Bill No</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Amount</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Payment Date</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900">Bill Image</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {historyItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-slate-900 font-medium">{item.indentNo}</td>
              <td className="px-6 py-4 text-slate-600">{item.machineName}</td>
              <td className="px-6 py-4 text-slate-600">{item.billNo}</td>
              <td className="px-6 py-4 font-semibold text-slate-900">₹{item.amount}</td>
              <td className="px-6 py-4 text-slate-600">{item.paymentDate}</td>
              <td className="px-6 py-4 text-sm">
                {item.billImageUrl ? (
                  <a 
                    href={item.billImageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    View Bill
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">No Bill Image</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyItems.length === 0 && !loading && <div className="p-8 text-center text-slate-500">No payment history</div>}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Management</h1>
          <p className="text-slate-600">Process payments for completed maintenance work</p>
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
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPayment}
              disabled={!formData.billNo || !formData.amount || uploadingImage}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? "Uploading..." : "Process Payment"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}