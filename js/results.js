// === Utility Functions ===
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFormData() {
  return {
    startDate: localStorage.getItem("start-date"),
    endDate: localStorage.getItem("end-date"),
    entry: localStorage.getItem("entry"),
    exit: localStorage.getItem("exit"),
    style: JSON.parse(localStorage.getItem("style") || "[]"),
    activities: JSON.parse(localStorage.getItem("activities") || "[]"),
    group: localStorage.getItem("group"),
    pace: localStorage.getItem("pace")
  };
}

function calculateTripLength(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = (endDate - startDate) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.floor(diff));
}

function getGroupMultiplier(groupType) {
  switch (groupType) {
    case "couple": return 2;
    case "family": return 3;
    case "friends": return 4;
    default: return 1;
  }
}

async function getCoordinates(destinationName) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destinationName)}&count=1`);
  const data = await res.json();
  return data.results?.[0] || null;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function sortByProximity(destinations, entryCoords, exitCoords) {
  const sorted = [];
  const remaining = [...destinations];
  let current = { latitude: entryCoords.latitude, longitude: entryCoords.longitude };

  while (remaining.length > 1) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = getDistance(current.latitude, current.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < minDistance) {
        minDistance = d;
        nearestIndex = i;
      }
    }

    const next = remaining.splice(nearestIndex, 1)[0];
    sorted.push(next);
    current = next;
  }

  if (remaining.length === 1) {
    sorted.push(remaining[0]);
  }

  return sorted;
}

async function getWeather(lat, lon, date) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FBerlin`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.daily?.time?.length > 0) {
    return {
      temp_max: data.daily.temperature_2m_max[0],
      temp_min: data.daily.temperature_2m_min[0],
      precip: data.daily.precipitation_sum[0]
    };
  }

  return null;
}

async function appendWeatherToDestinations(startDate) {
  const cards = document.querySelectorAll(".destination-card");
  if (!startDate || cards.length === 0) return;

  const [year, month, day] = startDate.split("-");
  const years = [2023, 2024];

  for (const card of cards) {
    const title = card.querySelector("h3");
    const destinationName = title?.textContent?.trim();
    if (!destinationName) continue;

    await delay(400);
    const coords = await getCoordinates(destinationName);
    if (!coords) continue;

    const weatherBox = document.createElement("div");
    weatherBox.className = "weather-summary";
    weatherBox.innerHTML = `<h4>Past Weather for ${destinationName}</h4>`;

    for (const y of years) {
      const date = `${y}-${month}-${day}`;
      await delay(300);
      const weather = await getWeather(coords.latitude, coords.longitude, date);
      if (weather) {
        const p = document.createElement("p");
        p.textContent = `${date}: Max ${weather.temp_max}°C, Min ${weather.temp_min}°C, Rain: ${weather.precip} mm`;
        weatherBox.appendChild(p);
      }
    }

    card.appendChild(weatherBox);
  }
}

// === Main Display Logic ===
async function displayFilteredDestinations() {
  const data = getFormData();
  const destinations = await loadDestinations();
  const container = document.getElementById("trip-summary");

  const maxDays = calculateTripLength(data.startDate, data.endDate);
  const groupMultiplier = getGroupMultiplier(data.group);

  let daysUsed = 0;
  let totalEstimatedCost = 0;
  const selected = [];

  for (const destination of destinations) {
    const dailyCost = destination.averageCostPerDay;
    const requiredDays = destination.daysRequired;
    const baseCost = dailyCost * requiredDays * groupMultiplier;

    const futureDaysUsed = daysUsed + requiredDays;

    if (futureDaysUsed <= maxDays) {
      const totalCostWithExtras = baseCost * 2;
      selected.push({ ...destination, totalCostWithExtras });
      daysUsed = futureDaysUsed;
      totalEstimatedCost += totalCostWithExtras;
    }
  }

  if (selected.length === 0) {
    container.innerHTML = "<p>No destinations available within your travel duration.</p>";
    return;
  }

  const entryCoords = await getCoordinates(data.entry);
  const exitCoords = await getCoordinates(data.exit);
  if (!entryCoords || !exitCoords) {
    container.innerHTML = "<p>Could not fetch entry or exit coordinates. Try again later.</p>";
    return;
  }

  const enriched = [];
  for (const dest of selected) {
    const coords = await getCoordinates(dest.name);
    if (coords) {
      dest.latitude = coords.latitude;
      dest.longitude = coords.longitude;
    } else {
      dest.latitude = 0;
      dest.longitude = 0;
      console.warn("No coordinates found for:", dest.name, "- using fallback (0,0)");
    }
    enriched.push(dest);
  }

  const optimized = sortByProximity(enriched, entryCoords, exitCoords);

  const intro = `<p><strong>Your ${maxDays}-day Swiss adventure plan:</strong></p>
  <p><strong>Estimated total cost for ${groupMultiplier} traveler(s):</strong> CHF ${Math.round(totalEstimatedCost)}</p>
  <em>(Includes accommodation, travel, meals, coffee, and more.)</em>`;
  container.innerHTML = intro;

  optimized.forEach(dest => {
    const card = document.createElement("div");
    card.className = "destination-card";
    card.innerHTML = `
  <div class="card-content">
    <h3>${dest.name}</h3>
    <img src="assets/images/${dest.slug}.jpg" alt="${dest.name}" onerror="this.style.display='none'">
    <p>${dest.description}</p>
    <p><strong>Est. Cost for this stop:</strong> CHF ${Math.round(dest.totalCostWithExtras)}</p>
    <a class="map-button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name)}+Switzerland" target="_blank" title="View on map">🗺️ Map</a>
  </div>
`;
    container.appendChild(card);
  });

  appendWeatherToDestinations(data.startDate);
}

displayFilteredDestinations();