const darkModeKey = 'darkModeState';
const sideMenu = document.querySelector('aside');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const darkModeToggle = document.querySelector('.dark-mode');
const mapContainer = document.getElementById('map');
const searchContainer = document.getElementById('searchContainer');

let fireSensorActive = false;
let smokeSensorActive = false;

function saveDarkModeState() {
    const darkModeState = document.body.classList.contains('dark-mode-variables');
    localStorage.setItem(darkModeKey, JSON.stringify(darkModeState));
}

function loadDarkModeState() {
    const savedDarkModeState = localStorage.getItem(darkModeKey);
    if (savedDarkModeState) {
        const darkModeState = JSON.parse(savedDarkModeState);
        document.body.classList.toggle('dark-mode-variables', darkModeState);
        
        // Update the dark mode toggle button state
        updateDarkModeToggleButtonState(darkModeState);
        
        mapContainer.classList.toggle('dark-mode-map', darkModeState);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode-variables');
    
    // Update the dark mode toggle button state
    updateDarkModeToggleButtonState(isDarkMode);
    
    mapContainer.classList.toggle('dark-mode-map', isDarkMode);
}

function updateDarkModeToggleButtonState(isDarkMode) {
    // Toggle active class on the first span based on the dark mode state
    darkModeToggle.querySelector('span:nth-child(1)').classList.toggle('active', !isDarkMode);
    
    // Toggle active class on the second span with the opposite state
    darkModeToggle.querySelector('span:nth-child(2)').classList.toggle('active', isDarkMode);
}



function toggleSearchContainer() {
    // Toggle the display property using CSS classes for better separation of concerns
    if (searchContainer) {
        searchContainer.classList.toggle('visible');
    }
}

menuBtn.addEventListener('click', () => { sideMenu.style.display = 'block'; });
closeBtn.addEventListener('click', () => { sideMenu.style.display = 'none'; });
darkModeToggle.addEventListener('click', toggleDarkMode);

document.addEventListener('click', (event) => {
    const routingContainer = document.querySelector('.leaflet-routing-container');
    if (event.target.classList.contains('leaflet-routing-container')) {
        routingContainer.style.zIndex = '1002';
        searchContainer.style.zIndex = '1001';
    } else {
        routingContainer.style.zIndex = '';
        searchContainer.style.zIndex = '';
    }
});


document.addEventListener('DOMContentLoaded', () => {
    loadDarkModeState();
    // Your other DOMContentLoaded logic here...
});


// Add a beforeunload event listener to save dark mode state before leaving the page
window.addEventListener('beforeunload', saveDarkModeState);

function toggleInput(id) {
    const inputElement = document.getElementById(id);
    inputElement.style.display = (inputElement.style.display === 'none') ? 'block' : 'none';
}

function openEditProfilePopup() {
    document.getElementById('editProfilePopup').style.display = 'block';
}

function toggleSensorStatus(sensorType) {
    const statusElement = document.getElementById(sensorType + 'Status');
    const stateElement = document.getElementById(sensorType + 'State');
    const fireCircle = document.querySelector(`.${sensorType} svg circle`);

    if (sensorType === 'fireSensor') {
        fireSensorActive = !fireSensorActive;
    } else if (sensorType === 'smokeSensor') {
        smokeSensorActive = !smokeSensorActive;
    }

    const isActive = fireSensorActive || smokeSensorActive;
    statusElement.textContent = isActive ? 'Active' : 'Not Active';
    stateElement.textContent = isActive ? 'On' : 'Off';

    const colorClass = isActive ? 'color-success' : 'color-danger';
    fireCircle.classList.remove('color-success', 'color-danger');
    fireCircle.classList.add(colorClass);
}

const registerButton = document.getElementById('registerButton');

// Add a click event listener to the register button
registerButton.addEventListener('click', function() {
    // Redirect the user to the register page
    window.location.href = '/register';
});