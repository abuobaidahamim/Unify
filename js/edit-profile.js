// js/edit-profile.js
import { getCurrentUserProfile, updateUserProfile, uploadProfilePicture } from './auth.js';

let currentProfile = null;
let cropper = null;
let currentFile = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    const profilePicInput = document.getElementById('profilePicInput');
    const uploadBtn = document.getElementById('uploadPicBtn');
    const preview = document.getElementById('profilePicPreview');
    const cropCancel = document.getElementById('cropCancel');
    const cropModalClose = document.getElementById('cropModalClose');
    const cropSave = document.getElementById('cropSave');

    // Check if all required elements exist
    if (!cropModal || !cropImage || !profilePicInput || !uploadBtn || !preview || !cropCancel || !cropModalClose || !cropSave) {
        console.error('One or more required elements not found. Check your HTML IDs.');
        return;
    }

    // Check authentication and load profile
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const profile = await getCurrentUserProfile();
        if (!profile) {
            window.location.href = 'profile-setup.html';
            return;
        }

        currentProfile = profile;
        populateForm(profile);
        setupDynamicMajors();
        setupConditionalFields();
        
        uploadBtn.addEventListener('click', () => {
            profilePicInput.click();
        });

        // When user selects a file, open crop modal
        profilePicInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            currentFile = file;

            const reader = new FileReader();
            reader.onload = (e) => {
                cropImage.src = e.target.result;
                cropModal.classList.add('show');
                if (cropper) cropper.destroy();
                try {
                    cropper = new Cropper(cropImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        autoCropArea: 1,
                        background: false,
                    });
                } catch (error) {
                    console.error('Cropper initialization failed:', error);
                    alert('Cropper library not loaded. Please refresh.');
                }
            };
            reader.readAsDataURL(file);
        });

        // Cancel cropping
        cropCancel.addEventListener('click', closeCropModal);
        cropModalClose.addEventListener('click', closeCropModal);
        window.addEventListener('click', (e) => {
            if (e.target === cropModal) {
                closeCropModal();
            }
        });

        // Save cropped image and upload
        cropSave.addEventListener('click', async () => {
            if (!cropper) {
                alert('No image to crop.');
                return;
            }
            const canvas = cropper.getCroppedCanvas({
                width: 400,
                height: 400,
                imageSmoothingQuality: 'high',
            });

            canvas.toBlob(async (blob) => {
                const croppedFile = new File([blob], currentFile.name, { type: currentFile.type });

                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';

                try {
                    const downloadURL = await uploadProfilePicture(croppedFile);
                    preview.src = canvas.toDataURL();
                    alert('Profile picture updated!');
                    closeCropModal();
                } catch (error) {
                    console.error('Upload error:', error);
                    alert('Upload failed: ' + error.message);
                } finally {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = 'Upload New Picture';
                }
            }, currentFile.type);
        });

        // Form submission
        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('✅ Form submitted'); // Confirm handler runs

            try {
                // Collect all field values
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
                    status: document.querySelector('input[name="status"]:checked')?.value,
                    batch: document.getElementById('batch').value.trim() || null,
                    employment: document.querySelector('input[name="employment"]:checked')?.value,
                    company: document.getElementById('company').value || null,
                    role: document.getElementById('role').value || null,
                    sector: document.getElementById('sector').value || null,
                    businessType: document.getElementById('businessType').value || null,
                    // Social links
                    github: document.getElementById('github')?.value.trim() || null,
                    linkedin: document.getElementById('linkedin')?.value.trim() || null,
                    facebook: document.getElementById('facebook')?.value.trim() || null,
                    instagram: document.getElementById('instagram')?.value.trim() || null,
                    x: document.getElementById('x')?.value.trim() || null,
                };

                console.log('📦 Data to save:', updatedData);

                const result = await updateUserProfile(updatedData);
                console.log('📨 Save result:', result);

                if (result.success) {
                    alert('Profile updated successfully!');
                    window.location.href = 'personal-profile.html';
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                console.error('❌ Submit error:', error);
                alert('An error occurred: ' + error.message);
            }
        });
    });

    function closeCropModal() {
        cropModal.classList.remove('show');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        profilePicInput.value = ''; // clear input
    }
});

// (Keep all your existing helper functions unchanged: populateForm, setupDynamicMajors, setupConditionalFields)
// ... paste them here exactly as they were
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
    document.getElementById('github').value = profile.github || '';
    document.getElementById('linkedin').value = profile.linkedin || '';
    document.getElementById('facebook').value = profile.facebook || '';
    document.getElementById('instagram').value = profile.instagram || '';
    document.getElementById('x').value = profile.x || '';

    if (profile.status === 'student') {
        document.querySelector('input[name="status"][value="student"]').checked = true;
    } else if (profile.status === 'alumni') {
        document.querySelector('input[name="status"][value="alumni"]').checked = true;
    }

    const employment = profile.employment || 'none';
    const radio = document.querySelector(`input[name="employment"][value="${employment}"]`);
    if (radio) radio.checked = true;

    if (employment === 'job') {
        document.getElementById('jobFields').style.display = 'block';
        document.getElementById('company').value = profile.company || '';
        document.getElementById('role').value = profile.role || '';
    } else if (employment === 'business') {
        document.getElementById('businessFields').style.display = 'block';
        document.getElementById('sector').value = profile.sector || '';
        document.getElementById('businessType').value = profile.businessType || '';
    }

    if (profile.profilePicURL) {
        document.getElementById('profilePicPreview').src = profile.profilePicURL;
    }
}

function setupDynamicMajors() {
    const departmentSelect = document.getElementById('department');
    const majorSelect = document.getElementById('major');
    const currentDept = departmentSelect.value;

    const majorOptions = {
        "Software Engineering (SWE)": ["None", "Data Science", "Robotics & Embedded Systems", "Cyber Security"],
        "Innovation & Entrepreneurship": ["None", "Technopreneurship", "Business Analytics & Digital Marketing", "Applied Entrepreneurial Finance", "Agripreneurship & Food Engineering", "Social Entrepreneurship", "Manufacturing Industries", "Service Industries"],
        "Architecture": ["None", "Architectural Design & Concept Development", "Urban Planning & Design", "Green Architecture & Environmental Simulation", "Architectural Technology & Construction", "History, Theory & Criticism of Architecture", "Landscape Architecture", "Technical systems in building", "Interior Architecture", "Digital Design & Visualization", "Professional Practice & Management"],
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

    if (currentDept) {
        updateMajorOptions(currentDept);
        if (currentProfile && currentProfile.major) {
            majorSelect.value = currentProfile.major;
        }
    }

    departmentSelect.addEventListener('change', (e) => {
        updateMajorOptions(e.target.value);
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
        });
    });
}