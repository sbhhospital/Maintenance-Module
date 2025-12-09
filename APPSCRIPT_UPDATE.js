// UPDATED GOOGLE APPS SCRIPT CODE
// Add this new handler function to your existing AppScript
// Keep all existing functions unchanged - just add this new one

// Handle GET requests
function doGet(e) {
  var output = ContentService.createTextOutput("Google Apps Script is running.");
  output.setMimeType(ContentService.MimeType.TEXT);
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
}

// Handle OPTIONS requests for CORS preflight
function doOptions(e) {
  var output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  output.setHeader('Access-Control-Max-Age', '86400');
  return output;
}

// Helper function to create JSON response with CORS headers
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return output;
}

// Function to upload a file to Google Drive
function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    Logger.log("Starting file upload: " + fileName);
    
    // Remove the data URL prefix if it exists
    var fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }
    
    // Decode the base64 data
    var decoded = Utilities.base64Decode(fileData);
    
    // Create a blob from the decoded data
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // Get the folder reference
    var folder;
    try {
      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }
    } catch (folderError) {
      Logger.log("Folder error, using root: " + folderError.toString());
      folder = DriveApp.getRootFolder();
    }
    
    // Upload the file to the folder
    var file = folder.createFile(blob);
    
    // Make the file accessible via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return the direct link to view the file in the correct format
    var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    Logger.log("File uploaded successfully: " + fileUrl);
    return fileUrl;
  } catch (error) {
    Logger.log("Error uploading file: " + error.toString());
    throw error;
  }
}

// NEW FUNCTION: Handle payment update with image upload
function uploadAndUpdatePayment(e) {
  try {
    Logger.log("Processing upload and update payment");
    
    var params = e.parameter;
    
    var sheetName = params.sheetName;
    var rowIndex = parseInt(params.rowIndex);
    var rowData = JSON.parse(params.rowData);
    var base64Data = params.base64Data;
    var fileName = params.fileName;
    var mimeType = params.mimeType;
    var folderId = params.folderId;
    
    var imageUrl = "";
    
    // Upload image if base64Data exists
    if (base64Data && base64Data !== "") {
      try {
        imageUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
        Logger.log("Bill image uploaded, URL: " + imageUrl);
        
        // Update the image URL in rowData at position 38 (Column AM)
        if (rowData.length > 38) {
          rowData[38] = imageUrl; // Update with actual image URL
        }
      } catch (uploadError) {
        Logger.log("Image upload failed: " + uploadError.toString());
        // Continue without image URL
      }
    }
    
    // Now update the row with the image URL and payment data
    if (!sheetName) {
      throw new Error("Sheet name is required");
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    if (isNaN(rowIndex) || rowIndex < 3) {
      throw new Error("Invalid row index for update: " + rowIndex);
    }
    
    // Log the Indent No from Column B before updating
    var indentNo = sheet.getRange(rowIndex, 2).getValue();
    Logger.log("Updating Row " + rowIndex + " with Indent No: " + indentNo);
    
    for (var i = 0; i < rowData.length; i++) {
      if (rowData[i] !== '') {
        sheet.getRange(rowIndex, i + 1).setValue(rowData[i]);
        Logger.log("Updated column " + (i + 1) + " with value: " + rowData[i]);
      }
    }
    
    return createJsonResponse({
      success: true,
      message: "Payment row " + rowIndex + " (Indent: " + indentNo + ") updated successfully with bill image",
      imageUrl: imageUrl,
      updatedRow: rowIndex,
      indentNo: indentNo
    });
    
  } catch (error) {
    Logger.log("Error in uploadAndUpdatePayment: " + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: "Failed to process payment update: " + error.message
    });
  }
}

// Main function to handle POST requests
function doPost(e) {
  try {
    Logger.log("Received POST request");
    
    var params = e.parameter;
    
    // NEW: Handle file upload AND payment update in one action
    if (params.action === 'uploadAndUpdatePayment') {
      return uploadAndUpdatePayment(e);
    }
    
    // Handle file upload AND sheet insertion in one action
    if (params.action === 'uploadAndInsert') {
      Logger.log("Processing upload and insert");
      
      var sheetName = params.sheetName;
      var rowData = JSON.parse(params.rowData);
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      
      var imageUrl = "";
      
      // Upload image if base64Data exists
      if (base64Data && base64Data !== "") {
        try {
          imageUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
          Logger.log("Image uploaded, URL: " + imageUrl);
          
          // Update the image URL in rowData at position 7 (Column H)
          // rowData format: [timestamp, "", machineName, department, problem, priority, date, imageUrl, plannedDate]
          // Index 7 is the image URL
          if (rowData.length > 7) {
            rowData[7] = imageUrl; // Update with actual image URL
          }
        } catch (uploadError) {
          Logger.log("Image upload failed: " + uploadError.toString());
          // Continue without image URL
        }
      }
      
      // Now insert the row with the updated image URL
      if (!sheetName) {
        throw new Error("Sheet name is required");
      }
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error("Sheet not found: " + sheetName);
      }
      
      if (!Array.isArray(rowData) || rowData.length === 0) {
        throw new Error("Invalid or empty row data array");
      }
      
      sheet.appendRow(rowData);
      
      return createJsonResponse({
        success: true,
        message: "Row added successfully with image",
        imageUrl: imageUrl,
        rowCount: sheet.getLastRow()
      });
    }
    
    // Handle file upload action only
    if (params.action === 'uploadFile') {
      Logger.log("Processing file upload");
      
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      
      // Validate required parameters
      if (!base64Data || !fileName || !mimeType) {
        throw new Error("Missing required parameters for file upload");
      }
      
      // Upload the file to Google Drive
      var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      
      return createJsonResponse({
        success: true,
        fileUrl: fileUrl,
        message: "File uploaded successfully"
      });
    }
    
    // Handle sheet operations only
    if (params.action === 'insert' || params.action === 'add') {
      Logger.log("Processing sheet insert");
      
      var sheetName = params.sheetName;
      
      if (!sheetName) {
        throw new Error("Sheet name is required");
      }
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error("Sheet not found: " + sheetName);
      }
      
      var rowData = JSON.parse(params.rowData);
      
      if (!Array.isArray(rowData) || rowData.length === 0) {
        throw new Error("Invalid or empty row data array");
      }
      
      sheet.appendRow(rowData);
      
      return createJsonResponse({
        success: true,
        message: "Row added successfully",
        rowCount: sheet.getLastRow()
      });
    }
    
    if (params.action === 'update') {
      Logger.log("Processing sheet update");
      
      var sheetName = params.sheetName;
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);
      
      if (!sheetName) {
        throw new Error("Sheet name is required");
      }
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error("Sheet not found: " + sheetName);
      }
      
      if (isNaN(rowIndex) || rowIndex < 3) {
        throw new Error("Invalid row index for update: " + rowIndex);
      }
      
      // Log the Indent No from Column B before updating
      var indentNo = sheet.getRange(rowIndex, 2).getValue();
      Logger.log("Updating Row " + rowIndex + " with Indent No: " + indentNo);
      
      for (var i = 0; i < rowData.length; i++) {
        if (rowData[i] !== '') {
          sheet.getRange(rowIndex, i + 1).setValue(rowData[i]);
          Logger.log("Updated column " + (i + 1) + " with value: " + rowData[i]);
        }
      }
      
      return createJsonResponse({
        success: true,
        message: "Row " + rowIndex + " (Indent: " + indentNo + ") updated successfully",
        updatedRow: rowIndex,
        indentNo: indentNo
      });
    }
    
    throw new Error("Unknown action: " + params.action);
    
  } catch (error) {
    Logger.log("Error in doPost: " + error.message);
    Logger.log("Stack trace: " + error.stack);
    
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    });
  }
}
