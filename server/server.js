require('dotenv').config();
const express = require("express");
const axios = require('axios');
const multer = require("multer");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const cors = require('cors');
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const app = express();
const uploadDir = path.join(__dirname, "../upload");
const upload = multer({ dest: uploadDir });
const cron = require('node-cron');

app.use(cors({ origin: '*', }));
app.use(express.static(path.join(__dirname, '../client/build')));
app.use('/upload', express.static(uploadDir));
app.use(express.json());

(async () => {
    try {
        await fsPromises.mkdir(uploadDir, { recursive: true });
    } catch (error) {
        console.error("Error creating upload directory:", error);
    }
})();

cron.schedule('1 * * * *', async () => {
    try {
        const response = await axios.delete('http://img2des.ap-south-1.elasticbeanstalk.com/api/delete-files');
        console.log('Scheduled delete files API response:', response.data);
    } catch (error) {
        console.error('Error calling delete files API:', error.message);
    }
});

app.get("/api/get-latest-csv", async (req, res) => {
    try {
        const files = await fsPromises.readdir(uploadDir);
        const csvFiles = files.filter(file => file.endsWith(".csv"));
        const latestCsvFile = csvFiles.sort().pop();

        if (latestCsvFile) {
            res.sendFile(path.join(uploadDir, latestCsvFile));
        } else {
            res.status(404).send("No CSV file found.");
        }
    } catch (error) {
        console.error("Error reading CSV files:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/api/save-csv", async (req, res) => {
    const updatedRow = req.body;

    try {
        const files = await fsPromises.readdir(uploadDir);
        const csvFiles = files.filter(file => file.endsWith(".csv"));
        const latestCsvFile = csvFiles.sort().pop();

        if (!latestCsvFile) {
            return res.status(404).send("No CSV file found to update.");
        }

        const csvFilePath = path.join(uploadDir, latestCsvFile);
        const csvData = [];
        let header = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('headers', (headers) => {
                header = headers;
            })
            .on('data', (row) => {
                csvData.push(row);
            })
            .on('end', async () => {
                const imageIndex = header.indexOf("Image");

                if (imageIndex === -1) {
                    return res.status(500).send("Image column not found in CSV.");
                }

                const rowIndex = csvData.findIndex(row => row.Image === updatedRow.Image);

                if (rowIndex === -1) {
                    return res.status(404).send("Row not found.");
                }

                csvData[rowIndex] = { ...csvData[rowIndex], ...updatedRow };

                const csvWriter = createCsvWriter({
                    path: csvFilePath,
                    header: header.map(key => ({ id: key, title: key })),
                });

                try {
                    await csvWriter.writeRecords(csvData);
                    res.json({ success: true });
                } catch (error) {
                    console.error('Error writing to CSV file:', error);
                    return res.status(500).send("Failed to update CSV file.");
                }
            });
    } catch (error) {
        console.error("Error processing CSV file:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.delete("/api/delete-files", async (req, res) => {
    try {
        const files = await fsPromises.readdir(uploadDir);
        const currentTime = Date.now();
        const oneHourInMillis = 3;
        const deletePromises = files.map(async (file) => {
            const filePath = path.join(uploadDir, file);
            const stats = await fsPromises.stat(filePath);
            const fileModifiedTime = stats.mtimeMs;
            if (currentTime - fileModifiedTime > oneHourInMillis) {
                await fsPromises.unlink(filePath);
                console.log(`Deleted file: ${file}`);
            }
        });

        await Promise.all(deletePromises);

        res.json({ success: true, message: "Old files deleted successfully." });
    } catch (error) {
        console.error("Error deleting old files:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});

app.post("/api/upload", upload.array("images"), async (req, res) => {
    const imageResponses = {};
    const promises = req.files.map(async (file) => {
        const timestamp = Date.now();
        const newFileName = `${timestamp}_${file.originalname}`;
        const newFilePath = path.join(uploadDir, newFileName);
        await fsPromises.rename(file.path, newFilePath);

        const pythonScriptPath = path.join(__dirname, 'generate_description.py');
        try {
            await fsPromises.access(pythonScriptPath);
        } catch (error) {
            console.error("Python script not found:", error);
            imageResponses[newFileName] = { error: "Python script not found" };
            return;
        }

        const pythonResponse = spawn('python3', [pythonScriptPath, newFilePath]);

        return new Promise((resolve) => {
            pythonResponse.stdout.on('data', (data) => {
                const result = JSON.parse(data.toString());
                imageResponses[newFileName] = result;
            });

            pythonResponse.stderr.on('data', (data) => {
                console.error(`Error from Python script: ${data}`);
                imageResponses[newFileName] = { error: "Failed to generate description" };
            });

            pythonResponse.on('close', () => {
                resolve();
            });
        });
    });

    await Promise.all(promises);
    const csvFilePath = path.join(uploadDir, `csv_${Date.now()}.csv`);
    await fsPromises.writeFile(csvFilePath, convertToCSV(imageResponses));
    res.json({ success: true, csvFilePath });
});

const convertToCSV = (data) => {
    const header = Object.keys(data[Object.keys(data)[0]]).map(key => `"${key}"`).join(",") + "\n";
    const rows = Object.entries(data).map(([key, value]) => {
        return Object.values(value).map(val => {
            if (typeof val === 'string') {
                val = val.replace(/"/g, '""');
                return `"${val}"`;
            }
            return val;
        }).join(",");
    }).join("\n");
    return header + rows;
};

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
});