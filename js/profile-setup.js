// js/profile-setup.js
import { saveProfile } from './auth.js';

// Wait for Firebase Auth to be ready
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        alert('You must be logged in to complete your profile.');
        window.location.href = 'signup.html';
        return;
    }
    initializeForm();
});

function initializeForm() {
    const form = document.getElementById('profileForm');
    const departmentSelect = document.getElementById('department');
    const majorSelect = document.getElementById('major');

    // Employment elements
    const employmentRadios = document.getElementsByName('employment');
    const jobFields = document.getElementById('jobFields');
    const businessFields = document.getElementById('businessFields'); // now used for both sector and businessType
    const companyInput = document.getElementById('company');
    const roleInput = document.getElementById('role');
    const sectorInput = document.getElementById('sector');
    const businessTypeInput = document.getElementById('businessType');

    // Define major options per department
    const majorOptions = {
        "Software Engineering (SWE)": [
            "None",
            "Data Science",
            "Robotics & Embedded Systems",
            "Cyber Security"
        ],
        "Innovation & Entrepreneurship": [
            "None",
            "Technopreneurship",
            "Business Analytics & Digital Marketing",
            "Applied Entrepreneurial Finance",
            "Agripreneurship & Food Engineering",
            "Social Entrepreneurship",
            "Manufacturing Industries",
            "Service Industries"
        ],
        "Architecture": [
            "None",
            "Architectural Design & Concept Development",
            "Urban Planning & Design",
            "Green Architecture & Environmental Simulation",
            "Architectural Technology & Construction",
            "History, Theory & Criticism of Architecture",
            "Landscape Architecture",
            "Technical systems in building",
            "Interior Architecture",
            "Digital Design & Visualization",
            "Professional Practice & Management"
        ],
        // All other departments: only "None"
        "Computing and Information System (CIS)": ["None"],
        "Multimedia & Creative Technology (MCT)": ["None"],
        "Information Technology & Management (ITM)": ["None"],
        "Law": ["None"],
        "Journalism, Media and Communication (JMC)": ["None"],
        "Textile Engineering (TE)": ["None"],
        "Civil Engineering (CE)": ["None"],
        "Pharmacy": ["None"],
        "Nutrition and Food Engineering (NFE)": ["None"],
        "Computer Science & Engineering": ["None"],
        "Electrical & Electronic Engineering": ["None"]
    };

    // Function to update major dropdown based on selected department
    function updateMajorOptions() {
        const selectedDept = departmentSelect.value;
        const options = majorOptions[selectedDept] || ["None"]; // default to None if department not found
        majorSelect.innerHTML = '<option value="" disabled selected>Select major (or None)</option>';
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt;
            optionEl.textContent = opt;
            majorSelect.appendChild(optionEl);
        });
    }

    // Listen for department change
    departmentSelect.addEventListener('change', updateMajorOptions);

    // Initial population (if a department is pre-selected, but it won't be)
    updateMajorOptions();

    // Employment change: show/hide relevant fields (now only job and business)
    employmentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Hide all first
            jobFields.style.display = 'none';
            businessFields.style.display = 'none';

            // Disable required for hidden fields
            companyInput.required = false;
            roleInput.required = false;
            sectorInput.required = false;
            businessTypeInput.required = false;

            const value = e.target.value;
            if (value === 'job') {
                jobFields.style.display = 'block';
                companyInput.required = true;
                roleInput.required = true;
            } else if (value === 'business') {
                businessFields.style.display = 'block';
                sectorInput.required = true;
                businessTypeInput.required = true;
            }
            // if 'none', all remain hidden
        });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const profileData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            dob: document.getElementById('dob').value,
            university: document.getElementById('university').value,
            department: departmentSelect.value,
            major: majorSelect.value || null,
            status: document.querySelector('input[name="status"]:checked').value,
            batch: document.getElementById('batch').value.trim() || null,
            employment: document.querySelector('input[name="employment"]:checked').value,
            company: companyInput.value || null,
            role: roleInput.value || null,
            sector: sectorInput.value || null,
            businessType: businessTypeInput.value || null,
        };

        const result = await saveProfile(profileData);
        if (result.success) {
            alert('Your account is created!');
            window.location.href = 'index.html';
        } else {
            alert('Error: ' + result.message);
        }
    });
}