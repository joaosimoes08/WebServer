const foodImages = {
    "Meat": "images/meat.jpeg",
    "Fish": "images/fish.jpeg",
    "Vegetables": "images/vegetables.jpg",
    "Dairy": "images/dairy.jpg",
    "Fruits": "images/fruits.jpg",
    "Cheese": "images/cheese.jpg",
};

const foodThresholds = {
    Vegetables: { 
        ppmMin: 10, ppmMid: 50, ppmMax: 100, tempMin: 5, tempMax: 12,
        TVOCMin: 0.05, TVOCMid: 0.27, TVOCMax: 0.53 // ppb
    },
    Meat: { 
        ppmMin: 5, ppmMid: 30, ppmMax: 80, tempMin: 0, tempMax: 5,
        TVOCMin: 0.03, TVOCMid: 0.16, TVOCMax: 0.43 // ppb
    },
    Dairy: { 
        ppmMin: 8, ppmMid: 40, ppmMax: 90, tempMin: 2, tempMax: 6,
        TVOCMin: 0.03, TVOCMid: 0.21, TVOCMax: 0.48 // ppb
    },
    Cheese: { 
        ppmMin: 8, ppmMid: 40, ppmMax: 90, tempMin: 2, tempMax: 6,
        TVOCMin: 0.05, TVOCMid: 0.32, TVOCMax: 0.64 // ppb
    },
    Fruits: { 
        ppmMin: 8, ppmMid: 40, ppmMax: 90, tempMin: 2, tempMax: 10,
        TVOCMin: 0.05, TVOCMid: 0.37, TVOCMax: 0.80 // ppb
    },
    Fish: { 
        ppmMin: 10, ppmMid: 250, ppmMax: 600, tempMin: 2, tempMax: 4,
        TVOCMin: 0.03, TVOCMid: 0.11, TVOCMax: 0.27 // ppb
    },
};


let trays = [];

async function fetchAndPopulateTrays() {
    try {
        const response = await fetch("/api/sensors");
        if (!response.ok) {
            throw new Error("Failed to fetch tray data from API.");
        }
        const fetchedData = await response.json();

        // Populate the trays array with the retrieved data
        trays = fetchedData.map((tray) => ({
            tray_number: tray.tray_number,
            food_type: tray.tray_food,
            image_url: foodImages[tray.tray_image] || foodImages["Meat"],
            name: tray.tray_name,
        }));

        //console.log("Trays populated:", trays); // Debug log
    } catch (error) {
        console.error("Error fetching and populating trays:", error);
    }
}

async function renderTrays() {
    await fetchAndPopulateTrays();
    
    trays.forEach((tray, index) => {
        dropdowns[index].value = tray.food_type;
        const trayElement = document.createElement("div");
        trayElement.className = `tray ${tray.name}`;
        trayElement.style.backgroundImage = `url(${foodImages[tray.food_type]})`;
        trayElement.style.borderColor = "red";
        const titleElement = document.createElement("div");
        titleElement.className = "tray-title";
        titleElement.innerText = tray.name;
        trayElement.appendChild(titleElement);
        trayContainer.appendChild(trayElement);

        dropdowns[index].addEventListener("change", (event) => {
            updateDoughnutChart(dailyDoughnutChart, data);
            const selectedFoodType = event.target.value;
            trayElement.style.backgroundImage = `url(${foodImages[selectedFoodType]})`;
            saveSelectedFood(index + 1, selectedFoodType); // Tray numbers are 1-based
            
        });
    });
}

renderTrays();

const trayContainer = document.getElementById("trays");
const dropdowns = document.querySelectorAll("select[data-tray]");

// Render trays

// Simulated data for PPM and temperature
let data = [
    { ppm: 400, temp: 26, tray_number: 1 }, // Tray 1
    { ppm: 400, temp: 14, tray_number: 2 }, // Tray 2
    { ppm: 60, temp: 40, tray_number: 3 }, // Tray 3
    { ppm: 4499, temp: 24, tray_number: 4 }, // Tray 4
    { ppm: 100, temp: 1, tray_number: 5 }, // Tray 5
    { ppm: 14040, temp: 10, tray_number: 6 }, // Tray 6
];

async function fetchSensorDataAndUpdate() {
    try {
        const response = await fetch("/api/sensors");
        if (!response.ok) throw new Error("Failed to fetch sensor data");

        const sensorsData = await response.json();

        // Update the data array
        data = sensorsData;
        updateDoughnutChart(dailyDoughnutChart, data);
        data.forEach((entry, index) => {
            const bar = document.getElementById(`stat-bar-${index + 1}`);
            const tray = trayContainer.children[index];
    
            // Determine color based on thresholds
            const values = { ppm: entry.ppm, temperature: entry.temp, TVOC: entry.tvoc };
            let color;
            if (entry.status === "good") {
                color = getColorGradient(values, trays[index].food_type);
            } else {
                color = { r: 255, g: 0, b: 0 };
            }
            const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            bar.style.background = rgbColor;
    
            // Set tray outline color
            tray.style.borderColor = rgbColor;
            tray.style.boxShadow = `0 0 3px ${rgbColor}`; // Add a subtle glowing effect
            tray.style.borderRadius = "10px"; // Smooth rounded corners\
    
            // Hover event listener for displaying data
            bar.addEventListener("mouseover", (event) => {
                const tooltip = document.createElement("div");
                tooltip.className = "tooltip";
                const thresholds = foodThresholds[trays[index].food_type] || { ppmMin: 0, ppmMid: 50, ppmMax: 100, tempMin: 0, tempMax: 100 };
                const ppmColor = entry.ppm > thresholds.ppmMax || entry.ppm < thresholds.ppmMin ? "red" : "white";
                const tempColor = entry.temp > thresholds.tempMax || entry.temp < thresholds.tempMin ? "red" : "white";
                const tvocColor = entry.tvoc > thresholds.TVOCMax || entry.tvoc < thresholds.TVOCMin ? "red" : "white";            
                // Construct the tooltip content
                if (entry.status === "good") {
                    tooltip.innerHTML = `
                        CO2: <span style="color: ${ppmColor}">${entry.ppm}ppm</span>, 
                        Temp: <span style="color: ${tempColor}">${entry.temp}°C</span>, 
                        TVOC: <span style="color: ${tvocColor}">${entry.tvoc}ppb</span>
                    `;
                } else {
                    tooltip.innerHTML = `
                        <span style="color: rgb(255,0,0)">The food is not good. Replace it fast.</span>
                    `;
                }
                tooltip.style.position = "absolute";
                tooltip.style.background = "rgba(0, 0, 0, 0.75)";
                tooltip.style.color = "white";
                tooltip.style.padding = "5px 10px";
                tooltip.style.borderRadius = "5px";
                tooltip.style.fontSize = "0.9rem";
                tooltip.style.top = `${event.clientY - 30}px`;
                tooltip.style.left = `${event.clientX + 10}px`;
                tooltip.style.pointerEvents = "none";
                tooltip.id = `tooltip-${index}`;
    
                document.body.appendChild(tooltip);
            });
    
            bar.addEventListener("mouseout", () => {
                const tooltip = document.getElementById(`tooltip-${index}`);
                if (tooltip) tooltip.remove();
            });
        });
    } catch (error) {
        console.error("Error fetching sensor data:", error);
    }
}

fetchSensorDataAndUpdate();
setInterval(fetchSensorDataAndUpdate, 1000);

function interpolate(value, min, max, newMin, newMax) {
    if (value <= min) return newMin;
    if (value >= max) return newMax;
    return ((value - min) / (max - min)) * (newMax - newMin) + newMin;
}

function interpolateColor(value, min, max, color1, color2) {
    const ratio = (value - min) / (max - min);
    return {
        r: Math.round(color1.r + ratio * (color2.r - color1.r)),
        g: Math.round(color1.g + ratio * (color2.g - color1.g)),
        b: Math.round(color1.b + ratio * (color2.b - color1.b)),
    };
}

function getColorGradient(values, foodType) {
    // Extract thresholds for the specified food type
    const thresholds = foodThresholds[foodType] || {
        ppmMin: 0, ppmMid: 50, ppmMax: 100, 
        tempMin: 0, tempMax: 10, 
        TVOCMin: 0, TVOCMid: 0.5, TVOCMax: 1.0
    };

    const { ppm, temperature, TVOC } = values; // Input values for ppm, temperature, and TVOC

    // Define base colors
    const green = { r: 0, g: 255, b: 0 };  // Safe
    const orange = { r: 255, g: 165, b: 0 }; // Warning
    const red = { r: 255, g: 0, b: 0 };     // Danger

    // Track the highest priority factor and corresponding color
    let criticalScore = 0; // 0 = safe, 0.5 = warning, 1 = danger

    // CO2 (ppm) contribution
    if (ppm >= thresholds.ppmMax) {
        return red; // Critical condition, ppm exceeds max
    } else if (ppm >= thresholds.ppmMid) {
        criticalScore = Math.max(criticalScore, interpolate(ppm, thresholds.ppmMid, thresholds.ppmMax, 0.5, 1));
    } else {
        criticalScore = Math.max(criticalScore, interpolate(ppm, thresholds.ppmMin, thresholds.ppmMid, 0, 0.5));
    }

    // Temperature contribution
    if (temperature > thresholds.tempMax) {
        return red; // Critical condition, temperature exceeds max
    } else {
        criticalScore = Math.max(criticalScore, interpolate(temperature, thresholds.tempMin, thresholds.tempMax, 0, 1));
    }

    // TVOC contribution
    if (TVOC >= thresholds.TVOCMax) {
        return red; // Critical condition, TVOC exceeds max
    } else if (TVOC >= thresholds.TVOCMid) {
        criticalScore = Math.max(criticalScore, interpolate(TVOC, thresholds.TVOCMid, thresholds.TVOCMax, 0.5, 1));
    } else {
        criticalScore = Math.max(criticalScore, interpolate(TVOC, thresholds.TVOCMin, thresholds.TVOCMid, 0, 0.5));
    }

    // Use the critical score to interpolate the color (green -> orange -> red)
    return interpolateColor(criticalScore, 0, 1, green, red);
}


// Render Chart.js pie chart in the right panel

function collectFoodTypeData() {
    const counts = Array(foodTypes.length).fill(0); // Initialize counts for each type

    document.querySelectorAll("[data-tray]").forEach((dropdown) => {
        const selectedType = dropdown.value;
        const index = foodTypes.indexOf(selectedType); // Find index dynamically
        if (index >= 0) {
            counts[index] += 1; // Increment count for the selected food type
        }
    });

    return counts;
}

function getBorderColors(dataArray) {
    return dataArray.map((tray) => {
        if (tray.ppm <= 400) return "#4CAF50"; // Green for safe
        if (tray.ppm <= 1000) return "#FFC107"; // Yellow for moderate
        return "#F44336"; // Red for high
    });
}

const foodTypes = Object.keys(foodImages);

let chartData = collectFoodTypeData();

function updateDoughnutChart(chart, data) {
    const foodTypeData = collectFoodTypeData(); // Get current food type counts
    const borderColors = getBorderColors(data); // Update border colors based on updated data

    chart.data.datasets[0].data = foodTypeData; // Update chart data
    chart.data.datasets[0].borderColor = borderColors; // Update border colors
    chart.update(); // Refresh the chart
}

const ctx = document.getElementById('dailyChart').getContext('2d');

const dailyDoughnutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
        labels: foodTypes, // Use dynamically extracted food types
        datasets: [
            {
                label: "Food Type Distribution",
                data: chartData, // Array of counts for each food type
                backgroundColor: [
                    "#FF6384", // Meat - Red
                    "#36A2EB", // Fish - Blue
                    "#FFCE56", // Vegetables - Yellow
                    "#4BC0C0", // Dairy - Teal
                    "#9966FF", // Cheese - Purple
                    "#FF9F40", // Fruits - Orange
                ],
                borderColor: "#ffffff",
                borderWidth: 2,
            },
        ],
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: "bottom",
            },
        },
    },
});

async function saveSelectedFood(trayNumber, selectedFoodType) {
    try {
        const response = await fetch("/api/food-images", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tray_number: trayNumber,
                tray_food: selectedFoodType,
                tray_image: foodImages[selectedFoodType], // Include the image URL for reference
            }),
        });

        if (!response.ok) {
            console.error("Failed to save food selection:", await response.text());
        } else {
            console.log(`Tray ${trayNumber} updated successfully with food type: ${selectedFoodType}`);
        }
    } catch (error) {
        console.error("Error saving food selection to API:", error);
    }
}
