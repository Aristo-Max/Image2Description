require('dotenv').config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const app = express();
const uploadDir = path.join(__dirname, "upload");
const upload = multer({ dest: uploadDir });

app.use(express.static(path.join(__dirname, 'build')));
app.use('/upload', express.static(uploadDir));
app.use(express.json());

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.get("/api/get-latest-csv", (req, res) => {
    const files = fs.readdirSync(uploadDir);
    const csvFiles = files.filter(file => file.endsWith(".csv"));
    const latestCsvFile = csvFiles.sort().pop();

    if (latestCsvFile) {
        res.sendFile(path.join(uploadDir, latestCsvFile));
    } else {
        res.status(404).send("No CSV file found.");
    }
});

app.post("/api/save-csv", (req, res) => {
    const updatedRow = req.body;

    const csvFiles = fs.readdirSync(uploadDir).filter(file => file.endsWith(".csv"));
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
        .on('end', () => {
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

            csvWriter.writeRecords(csvData)
                .then(() => {
                    res.json({ success: true });
                })
                .catch((error) => {
                    console.error('Error writing to CSV file:', error);
                    return res.status(500).send("Failed to update CSV file.");
                });
        });
});

app.post("/api/upload", upload.array("images"), async (req, res) => {
    const imageResponses = {};
    const promises = req.files.map(async (file) => {
        const timestamp = Date.now();
        const newFileName = `${timestamp}_${file.originalname}`;
        const newFilePath = path.join(uploadDir, newFileName);
        fs.renameSync(file.path, newFilePath);

        // const python_response = spawn('python', ['generate_description.py', newFilePath]);
        const python_response = spawn('/home/site/wwwroot/i2d/bin/python', [path.join(__dirname, 'generate_description.py'), newFilePath]);

        return new Promise((resolve) => {
            python_response.stdout.on('data', (data) => {
                const result = JSON.parse(data.toString());
                imageResponses[newFileName] = result;
                resolve();
            });

            python_response.stderr.on('data', (data) => {
                console.error(`Error from Python script: ${data}`);
                imageResponses[newFileName] = { error: "Failed to generate description" };
                resolve();
            });
        });
    });

    await Promise.all(promises);
    const csvFilePath = path.join(uploadDir, `csv_${Date.now()}.csv`);
    fs.writeFileSync(csvFilePath, convertToCSV(imageResponses));
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
