
// Verions -2 

const map = L.map('map'); // Initialize the map without a location
let userMarker;
let hospitalMarker;
let routeLine;
let routingControl; // To hold routing control

// Get the user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        document.getElementById('status').textContent = 'Geolocation is not supported by your browser.';
    }
}

// On successful location fetch
function success(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;

    // Center the map on the user's location
    map.setView([userLat, userLon], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Remove any existing markers, route, and routing control
    if (userMarker) map.removeLayer(userMarker);
    if (hospitalMarker) map.removeLayer(hospitalMarker);
    if (routeLine) map.removeLayer(routeLine);
    if (routingControl) map.removeControl(routingControl);

    // Add a marker for the user's location
    userMarker = L.marker([userLat, userLon]).addTo(map);
    userMarker.bindPopup("You are here").openPopup();

    // Fetch nearest hospital
    findNearestHospital(userLat, userLon);
}

function error() {
    document.getElementById('status').textContent = 'Unable to retrieve your location.';
}

function findNearestHospital(lat, lon) {
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="hospital"](around:25000,${lat},${lon});out;`;

    fetch(overpassUrl)
        .then(response => response.json())
        .then(data => {
            const hospitals = data.elements;

            if (hospitals.length === 0) {
                document.getElementById('status').textContent = 'No hospitals found nearby.';
                return;
            }

            // Find the nearest hospital
            let nearestHospital = null;
            let minDistance = Infinity;

            hospitals.forEach(hospital => {
                const distance = userMarker.getLatLng().distanceTo([hospital.lat, hospital.lon]); // Use Leaflet's built-in distanceTo method
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestHospital = hospital;
                }
            });

            // Add a marker for the nearest hospital
            hospitalMarker = L.marker([nearestHospital.lat, nearestHospital.lon]).addTo(map);
            hospitalMarker.bindPopup(`${nearestHospital.tags.name}<br>Distance: ${(minDistance / 1000).toFixed(2)} km`).openPopup();

            // Use Leaflet Routing Machine to get the route
            getRoute(lat, lon, nearestHospital.lat, nearestHospital.lon);
        })
        .catch(err => {
            console.error(err);
            document.getElementById('status').textContent = 'Error fetching hospital data.';
        });
}

// Function to get route using Leaflet Routing Machine
function getRoute(userLat, userLon, hospitalLat, hospitalLon) {
    const start = L.latLng(userLat, userLon);
    const end = L.latLng(hospitalLat, hospitalLon);

    // Initialize the routing control
    routingControl = L.Routing.control({
        waypoints: [start, end],
        routeWhileDragging: true,
        createMarker: function() { return null; } // Don't show markers for waypoints
    }).addTo(map);

    // Get the route and update status with road distance
    routingControl.on('routesfound', function(e) {
        const route = e.routes[0];
        const roadDistance = route.summary.totalDistance / 1000; // Convert to km
        document.getElementById('status').textContent = `Nearest hospital is ${roadDistance.toFixed(2)} km away via road.`;
    });
}


// Refresh button functionality
document.querySelector('.location-refresh-btn').addEventListener('click', function () {
    document.getElementById('status').textContent = 'Fetching your current location...';
    getUserLocation();
});

// Initial call to get user location when page loads
getUserLocation();

