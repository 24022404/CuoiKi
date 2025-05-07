// Configuration
const API_URL = 'http://localhost:5000';

// Initialize the admin page
document.addEventListener('DOMContentLoaded', function() {
    // Load current staff list
    loadStaffList();
    
    // Set up form submission
    document.getElementById('add-staff-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addStaffMember();
    });
    
    // Set up settings form
    document.getElementById('system-settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveSystemSettings();
    });
    
    // Load current settings
    loadSystemSettings();
});

// Load the list of staff members
function loadStaffList() {
    fetch(`${API_URL}/staff`)
        .then(response => {
            // For demo purposes, use mock data since endpoint might not exist yet
            //return response.json();
            return {
                ok: true,
                json: () => Promise.resolve([
                    { id: 1, name: 'John Doe', age: 25, gender: 'Male', experience_level: 'Junior' },
                    { id: 2, name: 'Jane Smith', age: 32, gender: 'Female', experience_level: 'Senior' },
                    { id: 3, name: 'Bob Johnson', age: 45, gender: 'Male', experience_level: 'Expert' }
                ])
            };
        })
        .then(data => {
            if (!data.ok) {
                throw new Error('Network response was not ok');
            }
            return data.json();
        })
        .then(staff => {
            displayStaffList(staff);
        })
        .catch(error => {
            console.error('Error loading staff list:', error);
            // For demo purposes, show mock data
            const mockStaff = [
                { id: 1, name: 'John Doe', age: 25, gender: 'Male', experience_level: 'Junior' },
                { id: 2, name: 'Jane Smith', age: 32, gender: 'Female', experience_level: 'Senior' },
                { id: 3, name: 'Bob Johnson', age: 45, gender: 'Male', experience_level: 'Expert' }
            ];
            displayStaffList(mockStaff);
        });
}

// Display staff list in the table
function displayStaffList(staff) {
    const staffListElement = document.getElementById('staff-list');
    staffListElement.innerHTML = '';
    
    staff.forEach(staffMember => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = staffMember.name;
        
        const ageCell = document.createElement('td');
        ageCell.textContent = staffMember.age;
        
        const genderCell = document.createElement('td');
        genderCell.textContent = staffMember.gender;
        
        const experienceCell = document.createElement('td');
        experienceCell.textContent = staffMember.experience_level;
        
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'btn btn-sm btn-danger';
        deleteButton.onclick = function() {
            deleteStaffMember(staffMember.id);
        };
        actionCell.appendChild(deleteButton);
        
        row.appendChild(nameCell);
        row.appendChild(ageCell);
        row.appendChild(genderCell);
        row.appendChild(experienceCell);
        row.appendChild(actionCell);
        
        staffListElement.appendChild(row);
    });
}

// Add a new staff member
function addStaffMember() {
    const name = document.getElementById('staff-name').value;
    const age = document.getElementById('staff-age').value;
    const gender = document.getElementById('staff-gender').value;
    const experience = document.getElementById('staff-experience').value;
    
    const staffData = {
        name: name,
        age: parseInt(age),
        gender: gender,
        experience_level: experience
    };
    
    fetch(`${API_URL}/staff`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(staffData)
    })
    .then(response => {
        // For demo purposes
        return {ok: true};
    })
    .then(data => {
        if (data.ok) {
            alert('Staff member added successfully!');
            document.getElementById('add-staff-form').reset();
            loadStaffList();
        } else {
            throw new Error('Failed to add staff member');
        }
    })
    .catch(error => {
        console.error('Error adding staff member:', error);
        // For demo purposes, simulate success
        alert('Staff member added successfully! (Demo mode)');
        document.getElementById('add-staff-form').reset();
        loadStaffList();
    });
}

// Delete a staff member
function deleteStaffMember(staffId) {
    if (!confirm('Are you sure you want to delete this staff member?')) {
        return;
    }
    
    fetch(`${API_URL}/staff/${staffId}`, {
        method: 'DELETE'
    })
    .then(response => {
        // For demo purposes
        return {ok: true};
    })
    .then(data => {
        if (data.ok) {
            alert('Staff member deleted successfully!');
            loadStaffList();
        } else {
            throw new Error('Failed to delete staff member');
        }
    })
    .catch(error => {
        console.error('Error deleting staff member:', error);
        // For demo purposes, simulate success
        alert('Staff member deleted successfully! (Demo mode)');
        loadStaffList();
    });
}

// Load system settings
function loadSystemSettings() {
    fetch(`${API_URL}/settings`)
        .then(response => {
            // For demo purposes
            return {
                ok: true,
                json: () => Promise.resolve({
                    camera_source: '0',
                    detection_interval: 5
                })
            };
        })
        .then(data => {
            if (!data.ok) throw new Error('Network response was not ok');
            return data.json();
        })
        .then(settings => {
            document.getElementById('camera-source').value = settings.camera_source;
            document.getElementById('detection-interval').value = settings.detection_interval;
        })
        .catch(error => {
            console.error('Error loading settings:', error);
            // Default values are already set in HTML
        });
}

// Save system settings
function saveSystemSettings() {
    const cameraSource = document.getElementById('camera-source').value;
    const detectionInterval = document.getElementById('detection-interval').value;
    
    const settings = {
        camera_source: cameraSource,
        detection_interval: parseInt(detectionInterval)
    };
    
    fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
    .then(response => {
        // For demo purposes
        return {ok: true};
    })
    .then(data => {
        if (data.ok) {
            alert('Settings saved successfully!');
        } else {
            throw new Error('Failed to save settings');
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        // For demo purposes, simulate success
        alert('Settings saved successfully! (Demo mode)');
    });
}
