import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import Header from "./components/Header";
import Footer from "./components/Footer";
import axios from "axios";
import { saveAs } from 'file-saver';
import { ClipLoader } from 'react-spinners';

function App() {
  const [files, setFiles] = useState(() => {
    const savedFiles = localStorage.getItem("files");
    return savedFiles ? JSON.parse(savedFiles) : [];
  });
  const [previews, setPreviews] = useState([]);
  const [csvData, setCsvData] = useState(null);
  const [isCsvLoaded, setIsCsvLoaded] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [notification, setNotification] = useState({ message: "", type: "" });

  useEffect(() => {
    localStorage.setItem("files", JSON.stringify(files));
  }, [files]);

  const showNotification = (message, type) => {
    console.log("Showing notification:", message, type);
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: "", type: "" });
    }, 3000);
  };

  const handleFileChange = (selectedFiles) => {
    const newFiles = Array.from(selectedFiles);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    setPreviews((prevPreviews) => [
      ...prevPreviews,
      ...newFiles.map((file) => ({
        url: URL.createObjectURL(file),
        file,
        isLoading: false,
      })),
    ]);
  };

  const handleRemoveImage = (indexToRemove) => {
    const fileToRemove = previews[indexToRemove].file;
    setPreviews((prevPreviews) => prevPreviews.filter((_, i) => i !== indexToRemove));
    setFiles((prevFiles) => prevFiles.filter((file) => file !== fileToRemove));
  };

  const downloadCsv = () => {
    if (!csvData || csvData.length === 0) {
      alert("No data available to download.");
      return;
    }

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "data.csv");
  };

  const uploadImages = async () => {
    setIsLoading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const response = await axios.post("http://img2des.ap-south-1.elasticbeanstalk.com/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        showNotification("Images uploaded successfully!", "success");
        await loadCsv();
      } else {
        showNotification("Server Down!!", "error");
      }
    } catch (error) {
      console.error("Error uploading images:", error.response ? error.response.data : error.message);
      showNotification("Something went wrong with the server!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) =>
      ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
    );

    if (validFiles.length !== acceptedFiles.length) {
      alert("Some files were rejected. Only PNG, JPG, and JPEG are allowed.");
    }

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);

    const newPreviews = validFiles.map(() => ({
      isLoading: true,
      url: null,
    }));
    setPreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);

    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviews((prevPreviews) => {
          const updatedPreviews = [...prevPreviews];
          updatedPreviews[prevPreviews.length - validFiles.length + index] = {
            isLoading: false,
            url: reader.result,
          };
          return updatedPreviews;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
  });

  const loadCsv = async () => {
    try {
      const response = await fetch("http://img2des.ap-south-1.elasticbeanstalk.com/api/get-latest-csv");
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          setCsvData(results.data);
          setIsCsvLoaded(true);
        },
      });
    } catch (error) {
      console.error("Error loading the CSV file:", error);
      alert("Failed to load CSV file.");
    }
  };

  return (
    <div>
      <Header />
      <div style={{
        borderTop: "2px solid #0D9ECA",
        width: "100%",
        marginTop: "0",
      }} />
      {notification.message && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "400px",
            width: "90%",
            padding: "10px",
            backgroundColor: notification.type === "success" ? '#0D9ECA' : "#dc3545",
            color: "white",
            textAlign: "center",
            borderRadius: "5px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
          }}
        >
          {notification.message}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "75vh",
          fontFamily: "'Roboto', sans-serif",
          backgroundColor: "#F2FAFF",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: isCsvLoaded ? "1200px" : "800px",
            transition: "width 0.3s ease",
            padding: "30px",
            border: "1px solid #ddd",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            backgroundColor: "#fff",
          }}
        >
          {!isCsvLoaded ? (
            <>
              <h1 style={{ textAlign: "center", color: "#333" }}>Select Images</h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  uploadImages();
                }}
              >
                <div
                  {...getRootProps()}
                  style={{
                    border: "2px dashed #0D9ECA",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: isDragActive ? "#eaf6ff" : "#f9f9f9",
                    marginBottom: "15px",
                  }}
                >
                  <input {...getInputProps()} onChange={(e) => handleFileChange(e.target.files)} />
                  {isDragActive ? (
                    <p style={{ color: "#0D9ECA" }}>Drop the files here...</p>
                  ) : (
                    <p style={{ color: "#555" }}>
                      Select Images OR Drag & Drop Images here...
                    </p>
                  )}
                </div>
                {previews.length > 0 && (
                  <div
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      padding: "15px",
                      marginTop: "15px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "15px",
                        justifyContent: "center",
                      }}
                    >
                      {previews.map((preview, index) => (
                        <div
                          key={index}
                          style={{
                            position: "relative",
                            width: "80px",
                            height: "80px",
                            borderRadius: "5px",
                            border: "1px solid #ddd",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {preview.isLoading ? (
                            <div
                              style={{
                                width: "30px",
                                height: "30px",
                                border: "4px solid #ccc",
                                borderTop: "4px solid #0D9ECA",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                              }}
                            ></div>
                          ) : (
                            <img
                              src={preview.url}
                              alt={`Preview ${index + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            style={{
                              position: "absolute",
                              top: "-10px",
                              right: "-10px",
                              background: "#ffffff",
                              border: "none",
                              borderRadius: "50%",
                              cursor: "pointer",
                              color: "#000000",
                              fontSize: "20px",
                              width: "25px",
                              height: "25px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: "#0D9ECA",
                      color: "#fff",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    {isLoading ? <ClipLoader size={15} color={"#ffffff"} loading={isLoading} /> : "Upload Images"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h2 style={{ color: "#333" }}>Generated Product Information</h2>
                <button
                  onClick={downloadCsv}
                  style={{
                    backgroundColor: "#0D9ECA",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Download CSV
                </button>
              </div>
              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#0D9ECA",
                        color: "#fff",
                      }}
                    >
                      {csvData[0] &&
                        Object.keys(csvData[0])
                          .slice(0, 3)
                          .map((header) => (
                            <th
                              key={header}
                              style={{
                                padding: "10px",
                                border: "1px solid #ddd",
                              }}
                            >
                              {header}
                            </th>
                          ))}
                      <th
                        style={{
                          padding: "10px",
                          border: "1px solid #ddd",
                        }}
                      >
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData
                      .filter((row) => Object.values(row).some((value) => value))
                      .map((row, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                              textAlign: "center",
                            }}
                          >
                            {row.Image && (
                              <img
                                src={`http://img2des.ap-south-1.elasticbeanstalk.com/upload/${row.Image}`}
                                alt="Product"
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  objectFit: "cover",
                                  borderRadius: "5px",
                                }}
                                onError={(e) => (e.target.style.display = "none")}
                              />
                            )}
                          </td>
                          {Object.values(row)
                            .slice(1, 3)
                            .map((value, cellIndex) => (
                              <td
                                key={cellIndex}
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "10px",
                                  textAlign: "left",
                                }}
                              >
                                {value}
                              </td>
                            ))}
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                              textAlign: "center",
                            }}
                          >
                            <img
                              src='/more-info.svg'
                              alt="MoreInfo Icon"
                              onClick={() => setExpandedRow(row)}
                              style={{
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {expandedRow && (
                <div
                  style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    width: "80%",
                    maxHeight: "80%",
                    overflowY: "auto",
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    padding: "20px",
                    zIndex: 1000,
                    marginTop: "-300px",
                    marginLeft: "-40%",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#333" }}>
                      Product Details
                    </h2>
                    <button
                      onClick={() => setExpandedRow(null)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "36px",
                        color: "#333",
                      }}
                    >&times;</button>
                  </div>
                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    {expandedRow && expandedRow.Image && (
                      <img
                        src={`http://img2des.ap-south-1.elasticbeanstalk.com/upload/${expandedRow.Image}`}
                        alt="Product"
                        style={{
                          maxWidth: "300px",
                          maxHeight: "300px",
                          objectFit: "contain",
                          borderRadius: "5px",
                          border: "1px solid #ddd",
                        }}
                      />
                    )}
                  </div>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginTop: "10px",
                    }}
                  >
                    <tbody>
                      {Object.entries(expandedRow)
                        .slice(1)
                        .map(([key, value], index) => (
                          <tr
                            key={index}
                            style={{
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            <td
                              style={{
                                fontWeight: "bold",
                                padding: "10px",
                                textAlign: "left",
                                backgroundColor: "#f9f9f9",
                              }}
                            >
                              {key}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                textAlign: "left",
                              }}
                            >
                              <textarea
                                value={value}
                                onChange={(e) => {
                                  const updatedRow = { ...expandedRow };
                                  updatedRow[key] = e.target.value;
                                  setExpandedRow(updatedRow);
                                }}
                                style={{
                                  width: "100%",
                                  minHeight: "100px",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "5px",
                                  resize: "vertical",
                                  fontSize: "14px",
                                  lineHeight: "1.5",
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: "center", marginTop: "20px" }}>

                    <button
                      onClick={() => setExpandedRow(null)}
                      style={{
                        backgroundColor: "#DBF8FF",
                        color: "#0D9ECA",
                        border: "none",
                        padding: "10px 20px",
                        marginRight: "10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        transition: "background-color 0.3s, color 0.3s",
                      }}
                    >
                      CLOSE
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch("http://img2des.ap-south-1.elasticbeanstalk.com/api/save-csv", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(expandedRow),
                          });
                          if (response.ok) {
                            showNotification("Information updated successfully!", "success");
                            const updatedCsvData = csvData.map((row) =>
                              row.Image === expandedRow.Image ? expandedRow : row
                            );
                            setCsvData(updatedCsvData);
                            setExpandedRow(null);
                            loadCsv();
                          } else {
                            throw new Error("Failed to update Information");
                          }
                        } catch (error) {
                          console.error("Error saving row:", error);
                          showNotification("Failed to update Information. Please try again.", "error");
                        }
                      }}
                      style={{
                        backgroundColor: "#0D9ECA",
                        color: "#fff",
                        border: "1px solid #0D9ECA",
                        padding: "10px 20px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        marginRight: "10px",
                        transition: "background-color 0.3s, color 0.3s",
                      }}
                    >
                      UPDATE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{
        borderTop: "2px solid #0D9ECA",
        width: "100%",
        marginTop: "0",
      }} />
      <Footer />
    </div>
  );
}

export default App;