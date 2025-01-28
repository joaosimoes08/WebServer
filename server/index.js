//Import Libraries
const fs = require('fs');
const express = require("express");
const path = require("path");
const cors = require("cors");
let dotenv = require('dotenv');
const multer = require('multer');
const mongoose = require('mongoose'); // Added for MongoDB integration

dotenv.config();

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

const dataSchema = new mongoose.Schema({
    tray_name: String,
    tray_number: Number,
    ppm: Number,
    temp: Number,
    tvoc: Number,
    tray_food: String,
    tray_image: String,
    status: String,
});

const DataModel = mongoose.model("Data", dataSchema);


const app = express();
const PORT = process.env.PORT || 3000;

app.use(
    cors({
        origin: "http://localhost:3000", // Allow only this origin
    })
);

// Middleware to parse JSON data
app.use(express.json());

//JSON File for SensorData
const sensorsFile = path.join(__dirname,"data", "sensorsData.json");


//Start Data Array
let Data = [];

const initializeData = async () => {
    try {
        // Check if data exists in MongoDB
        const existingData = await DataModel.find();

        if (existingData.length === 0) {
            console.log("No existing data found in MongoDB. Initializing with default data.");

            // Default buffet data
            const defaultData = [
                { tray_name: "Buffet 1", ppm: 0, temp: 0, tvoc: 0, tray_number: 1, tray_food: "Meat", tray_image: "images/meat.jpeg", status: "good" },
                { tray_name: "Buffet 2", ppm: 0, temp: 0, tvoc: 0, tray_number: 2, tray_food: "Meat", tray_image: "images/meat.jpeg", status: "good" },
                { tray_name: "Buffet 3", ppm: 0, temp: 0, tvoc: 0, tray_number: 3, tray_food: "Meat", tray_image: "images/meat.jpeg", status: "good" },
                { tray_name: "Buffet 4", ppm: 0, temp: 0, tvoc: 0, tray_number: 4, tray_food: "Meat", tray_image: "images/meat.jpeg", status: "good" },
                { tray_name: "Buffet 5", ppm: 0, temp: 0, tvoc: 0, tray_number: 5, tray_food: "Meat", tray_image: "images/meat.jpeg", status: "good" },
                { tray_name: "Buffet 6", ppm: 0, temp: 0, tvoc: 0, tray_number: 6, tray_food: "Meat", tray_image: "images/meat.jpeg", status: "good" },
            ];

            // Insert default data into MongoDB
            await DataModel.insertMany(defaultData);
            console.log("Default data initialized in MongoDB.");

            // Update local Data array
            Data = defaultData;
        } else {
            console.log("Existing data found in MongoDB.");
            
            // Update local Data array with MongoDB data
            Data = existingData.map(item => ({
                tray_name: item.name,
                ppm: item.ppm,
                temp: item.temp,
                tvoc: item.tvoc,
                tray_number: item.tray_number,
                tray_food: item.tray_food,
                tray_image: item.tray_image,
                status: item.status,
            }));
        }
    } catch (error) {
        console.error("Error initializing data:", error);
    }
};

// Call the function to initialize data
initializeData();

//FUNCIONS

function encodeImageToBase64(imagePath) {
    return fs.readFileSync(imagePath, { encoding: "base64" });
}

//////////////////////

// API FOR IMAGES
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
});

// POST endpoint for image uploads
app.post("/api/upload", upload.single("file"), async (req, res) => {
    let { tray_number } = req.body;
    tray_number = Number(tray_number);

    console.log(tray_number);

    // Validate tray_number
    if (typeof tray_number !== "number" || tray_number <= 0) {
        return res.status(400).json({ error: "Invalid tray_number. It must be a positive number." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        // Convert the uploaded file (buffer) to Base64
        const base64Image = req.file.buffer.toString("base64");

        console.log(base64Image);
        // Get tray data from MongoDB
        const tray = await DataModel.findOne({ tray_number });
        if (!tray) {
            return res.status(404).json({ error: `Tray number ${tray_number} not found in the database.` });
        }

        // Mock AI Verdict - Replace with actual function
        const answer = "Olá"; // Replace with: await GPT_Veredict(tray.tray_food, tray.ppm, tray.tvoc, tray.temp, base64Image);

        if (!answer) {
            return res.status(500).json({ error: "Failed to get an answer from the AI model." });
        }

        // Update tray status based on AI verdict
        if (answer.trim().toLowerCase() === "yes") {
            tray.status = "good";
        } else {
            tray.status = "bad";
        }
        
        await tray.save();

        // Respond with success and updated tray data
        res.status(200).json({
            message: "Image uploaded and processed successfully.",
            trayData: tray,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process the image." });
    }
});

// Endpoint to receive and update sensor data
app.post("/api/sensors", async (req, res) => {
    const { tray_number, ppm, temperature, tvoc } = req.body;

    // Input validation
    if (
        typeof tray_number !== "number" ||
        typeof ppm !== "number" ||
        typeof temperature !== "number" ||
        typeof tvoc !== "number"
    ) {
        return res.status(400).json({ error: "Invalid data format. All fields must be numbers." });
    }

    // Validate tray_number (1-based index)
    if (tray_number < 1 || tray_number > Data.length) {
        return res.status(404).json({ error: `Tray number ${tray_number} is out of range.` });
    }

    // Update the data for the specific tray
    const trayIndex = tray_number - 1; // Convert tray_number (1-based) to array index (0-based)
    Data[trayIndex] = {
        ...Data[trayIndex], // Preserve the existing data
        ppm,
        temp: temperature,
        tvoc,
    };
    //saveSensorsToFile();
    try {
        // Find the tray in the database
        const tray = await DataModel.findOne({ tray_number });

        if (!tray) {
            return res.status(404).json({ error: `Tray number ${tray_number} not found.` });
        }

        // Update the tray's sensor data
        tray.ppm = ppm;
        tray.temp = temperature;
        tray.tvoc = tvoc;

        // Save the updated tray to the database
        await tray.save();

        console.log(`Updated Tray ${tray_number}:`, tray);

        // Respond with a success message
        res.status(200).json({
            message: `Data for Tray ${tray_number} updated successfully.`,
            updatedData: tray,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update the tray data." });
    }
});

//POST FOOD IMAGES
app.post("/api/food-images", async (req, res) => {
    const { tray_number, tray_food, tray_image } = req.body;

    // Validate input fields
    if (typeof tray_number !== "number" || !tray_food || !tray_image) {
        return res.status(400).json({ error: "Invalid data format. All fields are required." });
    }

    try {
        // Find the tray in MongoDB
        const tray = await DataModel.findOne({ tray_number });

        // Validate tray_number range
        if (!tray) {
            return res.status(404).json({ error: `Tray number ${tray_number} is out of range or does not exist.` });
        }

        // Update the tray's food and image data
        tray.tray_food = tray_food;
        tray.tray_image = tray_image;

        // Save the updated tray to MongoDB
        await tray.save();

        // Update the local Data array
        const trayIndex = tray_number - 1; // Convert tray_number (1-based) to array index (0-based)
        Data[trayIndex] = {
            ...Data[trayIndex], // Preserve the existing data
            tray_food,
            tray_image,
        };

        console.log(`Tray ${tray_number} updated with ${tray_food} (${tray_image})`);

        // Respond with success message and updated data
        res.status(200).json({
            message: `Tray ${tray_number} updated successfully.`,
            updatedData: Data[trayIndex],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update tray data." });
    }
});


// Endpoint to fetch all sensor data
app.get("/api/sensors", (req, res) => {
    res.status(200).json(Data);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//testAI();