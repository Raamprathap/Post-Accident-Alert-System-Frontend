
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

}

// Establish WebSocket connection
const socket = new WebSocket('wss://post-accident-alert-system-backend.onrender.com');

socket.onopen = () => {
    console.log('WebSocket connection established in map.html');
};

socket.onerror = (error) => {
    console.error('WebSocket error in map.html:', error);
};

socket.onclose = () => {
    console.warn('WebSocket connection closed in map.html');
};

const urlParams = new URLSearchParams(window.location.search);
const dusername = urlParams.get('username');
console.log("Username received:", dusername);

const userContent = {
    "Raam": {'name': 'Raam', 'hname': "Ganga Hospital"},
    "Prathap": {'name': 'Prathap', 'hname': "Amrita Clinic"},
};

document.querySelector(".hospital_name").innerHTML=`${userContent[dusername]['name']}<br>${userContent[dusername]['hname']}`

let p_name = null;

socket.onmessage = async (event) => {
    // Handle Blob objects
    if (event.data instanceof Blob) {
        const text = await event.data.text(); // Convert Blob to text
        console.log('Blob converted to text:', text);

        try {
            const data = JSON.parse(text); // Parse the text as JSON
            console.log('Parsed JSON message:', data);

            const type = data.type;
            const lat = data.latt;
            const lng = data.lngg;
            const username = data.user;
            console.log(type);
            console.log(username);
            console.log(lat);
            console.log(lng);
            p_name = data.pname;
            

            if (type === 'map_update' && lat && lng && username === userContent[dusername]['hname']) {
                console.log('Processing map update with coordinates:', lat, lng);
                getRouteToReceivedLocation(lat, lng);
            } else if (type !== 'map_update') {
                console.log(`Ignoring message of type '${type}' in map.html`);
            } else {
                console.error('Invalid data received in map.html or username mismatch:', data);
            }
        } catch (e) {
            console.error('Blob could not be parsed as JSON:', text);
        }
        return;
    }

    // Handle non-Blob messages (already JSON)
    try {
        const data = JSON.parse(event.data);
        console.log('Parsed JSON message:', data);

        const type = data.type;
        const lat = data.latt;
        const lng = data.lngg;
        const username = data.user;
        p_name = data.pname;

        if (type === 'map_update' && lat && lng && username === userContent[dusername]['hname']) {
            console.log('Processing map update with coordinates:', lat, lng);
            getRouteToReceivedLocation(lat, lng);
        } else if (type !== 'map_update') {
            console.log(`Ignoring message of type '${type}' in map.html`);
        } else {
            console.error('Invalid data received in map.html or username mismatch:', data);
        }
    } catch (e) {
        console.error('Invalid JSON message received:', event.data);
    }
};

document.querySelector('.location-refresh-btn').addEventListener('click', function () {
    document.getElementById('status').textContent = 'Fetching your current location...';
    const data = { type: "hospital_update", latt: "", lngg: "", hlat: "", hlngg: "", user: p_name, eta: "", severity: ""};
    console.log(data);
    const message = JSON.stringify(data);
    socket.send(message);
    getUserLocation();
});


function getRouteToReceivedLocation(lat, lng) {
    const userLocation = userMarker.getLatLng(); // Current user location
    const start = L.latLng(userLocation.lat, userLocation.lng);
    const end = L.latLng(lat, lng);

    userMarker = L.marker([lat, lng]).addTo(map);

    // Remove existing route and control
    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
        waypoints: [start, end],
        routeWhileDragging: true,
        createMarker: () => null // No markers
    }).addTo(map);

    routingControl.on('routesfound', function (e) {
        const route = e.routes[0];
        const distance = route.summary.totalDistance / 1000; // Convert to km
        document.getElementById('status').textContent = `Received location is ${distance.toFixed(2)} km away via road.`;
    });
}


function error() {
    document.getElementById('status').textContent = 'Unable to retrieve your location.';
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

// Initial call to get user location when page loads
getUserLocation();

