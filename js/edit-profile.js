// js/edit-profile.js
import { getCurrentUserProfile, updateUserProfile, uploadProfilePicture } from './auth.js';

let currentProfile = null;

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Load existing profile data
    const profile = await getCurrentUserProfile();
    if (!profile) {
        // If no profile, redirect to setup (should not happen)
        window.location.href = 'profile-setup.html';
        return;
    }

    currentProfile = profile;

    // Populate form fields
    populateForm(profile);

    // Handle dynamic majors and conditional fields
    setupDynamicMajors();
    setupConditionalFields();

    // Profile picture upload preview and button
    // Profile picture upload preview and button
    const profilePicInput = document.getElementById('profilePicInput');
    const uploadBtn = document.getElementById('uploadPicBtn');
    const preview = document.getElementById('profilePicPreview');

    uploadBtn.addEventListener('click', () => {
        profilePicInput.click();
    });

    profilePicInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name, 'type:', file.type, 'size:', file.size);

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Disable button and show uploading state
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        // Set a timeout to reset if upload takes too long
        const timeout = setTimeout(() => {
            console.error('Upload timed out after 30 seconds');
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload New Picture';
            alert('Upload timed out. Please check your internet connection and try again.');
        }, 30000);

        try {
            console.log('Calling uploadProfilePicture...');
            const downloadURL = await uploadProfilePicture(file);
            console.log('Upload successful, URL:', downloadURL);
            clearTimeout(timeout);
            alert('Profile picture updated successfully!');
        } catch (error) {
            clearTimeout(timeout);
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            // Revert preview if upload failed
            if (currentProfile?.profilePicURL) {
                preview.src = currentProfile.profilePicURL;
            } else {
                preview.src = 'https://via.placeholder.com/100';
            }
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload New Picture';
        }
    });
    
    // Form submission
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const updatedData = {
            bio: document.getElementById('bio').value.trim() || null,
            currentLocation: document.getElementById('currentLocation').value.trim() || null,
            permanentLocation: document.getElementById('permanentLocation').value.trim() || null,
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            dob: document.getElementById('dob').value,
            university: document.getElementById('university').value,
            department: document.getElementById('department').value,
            major: document.getElementById('major').value || null,
            status: document.querySelector('input[name="status"]:checked').value,
            batch: document.getElementById('batch').value.trim() || null,
            employment: document.querySelector('input[name="employment"]:checked').value,
            company: document.getElementById('company').value || null,
            role: document.getElementById('role').value || null,
            sector: document.getElementById('sector').value || null,
            businessType: document.getElementById('businessType').value || null,
        };

        const result = await updateUserProfile(updatedData);
        if (result.success) {
            alert('Profile updated successfully!');
            window.location.href = 'personal-profile.html';
        } else {
            alert('Error: ' + result.message);
        }
    });
});

function populateForm(profile) {
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('currentLocation').value = profile.currentLocation || '';
    document.getElementById('permanentLocation').value = profile.permanentLocation || '';
    document.getElementById('firstName').value = profile.firstName || '';
    document.getElementById('lastName').value = profile.lastName || '';
    document.getElementById('dob').value = profile.dob || '';
    document.getElementById('university').value = profile.university || '';
    document.getElementById('department').value = profile.department || '';
    document.getElementById('batch').value = profile.batch || '';

    // Status radio
    if (profile.status === 'student') {
        document.querySelector('input[name="status"][value="student"]').checked = true;
    } else if (profile.status === 'alumni') {
        document.querySelector('input[name="status"][value="alumni"]').checked = true;
    }

    // Employment radio
    const employment = profile.employment || 'none';
    const radio = document.querySelector(`input[name="employment"][value="${employment}"]`);
    if (radio) radio.checked = true;

    // Show appropriate employment fields and set their values
    if (employment === 'job') {
        document.getElementById('jobFields').style.display = 'block';
        document.getElementById('company').value = profile.company || '';
        document.getElementById('role').value = profile.role || '';
    } else if (employment === 'business') {
        document.getElementById('businessFields').style.display = 'block';
        document.getElementById('sector').value = profile.sector || '';
        document.getElementById('businessType').value = profile.businessType || '';
    }

    // Major will be populated after department is set, but we need to set its value after options are loaded
    // So we call a function to set major after department change
    // We'll handle it in setupDynamicMajors by setting a timeout or event
    if (profile.profilePicURL) {
        document.getElementById('profilePicPreview').src = profile.profilePicURL;
    }
}

function setupDynamicMajors() {
    const departmentSelect = document.getElementById('department');
    const majorSelect = document.getElementById('major');
    const currentDept = departmentSelect.value; // already set from populateForm

    // Define major options per department (same as profile-setup)
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

    function updateMajorOptions(selectedDept) {
        const options = majorOptions[selectedDept] || ["None"];
        majorSelect.innerHTML = '<option value="" disabled selected>Select major (or None)</option>';
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt;
            optionEl.textContent = opt;
            majorSelect.appendChild(optionEl);
        });
    }

    // Initial update based on current department
    if (currentDept) {
        updateMajorOptions(currentDept);
        // Set the stored major value after options are loaded
        if (currentProfile && currentProfile.major) {
            majorSelect.value = currentProfile.major;
        }
    }

    // Update on department change
    departmentSelect.addEventListener('change', (e) => {
        updateMajorOptions(e.target.value);
        // Clear major selection
        majorSelect.value = '';
    });
}

function setupConditionalFields() {
    const employmentRadios = document.getElementsByName('employment');
    const jobFields = document.getElementById('jobFields');
    const businessFields = document.getElementById('businessFields');
    const companyInput = document.getElementById('company');
    const roleInput = document.getElementById('role');
    const sectorInput = document.getElementById('sector');
    const businessTypeInput = document.getElementById('businessType');

    employmentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            jobFields.style.display = 'none';
            businessFields.style.display = 'none';
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
            // 'none' keeps all hidden
        });
    });
}