// js/filter.js
const db = firebase.firestore();
let currentStep = 0;
let filterCriteria = {};
let allUsers = []; // cache for name search

export function initFilter() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const filterBtn = document.getElementById('filterBtn');
    const modal = document.getElementById('filterModal');
    const closeBtn = document.querySelector('.close');
    const filterSteps = document.getElementById('filterSteps');

    // Search by name with autocomplete
    setupSearchAutocomplete(searchInput);

    searchBtn.addEventListener('click', () => {
        const name = searchInput.value.trim().toLowerCase();
        if (!name) return;
        // Simple client‑side search
        const results = allUsers.filter(u => {
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
            return fullName.includes(name);
        });
        displaySearchResults(results);
    });

    // Open filter modal
    filterBtn.addEventListener('click', () => {
        modal.classList.add('show');
        startFilter();
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Cache all users for name search (optimisation)
    loadAllUsers();
}

async function loadAllUsers() {
    const snapshot = await db.collection('users').get();
    allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Autocomplete: show suggestions as user types
function setupSearchAutocomplete(input) {
    let currentFocus;
    input.addEventListener('input', function(e) {
        const val = this.value.trim().toLowerCase();
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;
        const listContainer = document.createElement('div');
        listContainer.setAttribute('id', 'autocomplete-list');
        listContainer.setAttribute('class', 'autocomplete-items');
        this.parentNode.appendChild(listContainer);

        const matches = allUsers.filter(u => {
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
            return fullName.includes(val);
        }).slice(0, 10); // limit to 10

        matches.forEach(user => {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
            const item = document.createElement('div');
            item.innerHTML = `<strong>${fullName.substr(0, val.length)}</strong>${fullName.substr(val.length)}`;
            item.innerHTML += `<input type='hidden' value='${user.id}'>`;
            item.addEventListener('click', function() {
                const userId = this.querySelector('input').value;
                window.location.href = `people-profile.html?uid=${userId}`;
                closeAllLists();
            });
            listContainer.appendChild(item);
        });
    });
    function closeAllLists(elmnt) {
        const items = document.getElementsByClassName('autocomplete-items');
        for (let i = 0; i < items.length; i++) {
            if (elmnt != items[i] && elmnt != input) {
                items[i].parentNode.removeChild(items[i]);
            }
        }
    }
    document.addEventListener('click', function(e) {
        closeAllLists(e.target);
    });
}

function displaySearchResults(results) {
    const modal = document.getElementById('filterModal');
    const container = document.getElementById('filterSteps');
    if (results.length === 0) {
        container.innerHTML = '<p>No users found.</p><button class="secondary" onclick="location.reload()">Close</button>';
    } else {
        let html = '<h4>Search Results:</h4><div class="filter-results">';
        results.forEach(user => {
            html += `
                <div class="filter-result-item" data-userid="${user.id}">
                    <img src="${user.profilePicURL || 'https://placehold.co/40'}" alt="Profile">
                    <span>${user.firstName || ''} ${user.lastName || ''}</span>
                </div>
            `;
        });
        html += '</div><button class="secondary" onclick="location.reload()">Close</button>';
        container.innerHTML = html;
        document.querySelectorAll('.filter-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userid;
                window.location.href = `people-profile.html?uid=${userId}`;
            });
        });
    }
    modal.classList.add('show');
}

// Filter logic
async function startFilter() {
    currentStep = 0;
    filterCriteria = {};
    renderFilterStep();
}

async function renderFilterStep() {
    const steps = [
        {
            question: 'Select university',
            type: 'select',
            options: ['Daffodil International University'],
            key: 'university',
            mandatory: true
        },
        {
            question: 'Select department',
            type: 'select',
            options: async () => {
                // Fixed list from profile-setup
                return [
                    "Software Engineering (SWE)",
                    "Innovation & Entrepreneurship (IE)",
                    "Computing and Information System (CIS)",
                    "Multimedia & Creative Technology (MCT)",
                    "Information Technology & Management (ITM)",
                    "Law",
                    "Journalism, Media and Communication (JMC)",
                    "Textile Engineering (TE)",
                    "Architecture",
                    "Civil Engineering (CE)",
                    "Pharmacy",
                    "Nutrition and Food Engineering (NFE)",
                    "Computer Science & Engineering (CSE)",
                    "Electrical & Electronic Engineering (EEE)"
                ];
            },
            key: 'department',
            mandatory: false
        },
        {
            question: 'Select major',
            type: 'select',
            options: async (criteria) => {
                if (!criteria.department) return ["None"];
                // Major options per department (same as profile-setup)
                const majorMap = {
                    "Software Engineering (SWE)": ["None", "Data Science", "Robotics & Embedded Systems", "Cyber Security"],
                    "Innovation & Entrepreneurship (IE)": ["None", "Technopreneurship", "Business Analytics & Digital Marketing", "Applied Entrepreneurial Finance", "Agripreneurship & Food Engineering", "Social Entrepreneurship", "Manufacturing Industries", "Service Industries"],
                    "Architecture": ["None", "Architectural Design & Concept Development", "Urban Planning & Design", "Green Architecture & Environmental Simulation", "Architectural Technology & Construction", "History, Theory & Criticism of Architecture", "Landscape Architecture", "Technical systems in building", "Interior Architecture", "Digital Design & Visualization", "Professional Practice & Management"],
                };
                return majorMap[criteria.department] || ["None"];
            },
            key: 'major',
            mandatory: false,
            dependsOn: ['department']
        },
        {
            question: 'Select batch',
            type: 'select',
            options: async () => {
                // Get distinct batches from existing users
                const snapshot = await db.collection('users').get();
                const batches = new Set();
                snapshot.forEach(doc => {
                    const batch = doc.data().batch;
                    if (batch) batches.add(batch);
                });
                return Array.from(batches).sort();
            },
            key: 'batch',
            mandatory: false
        },
        {
            question: 'Employment status',
            type: 'radio',
            options: ['Job', 'Business', 'None'],
            key: 'employment',
            mandatory: false
        },
        // Job details (conditional)
        {
            question: 'Select company',
            type: 'select',
            options: async () => {
                const snapshot = await db.collection('users').get();
                const companies = new Set();
                snapshot.forEach(doc => {
                    const company = doc.data().company;
                    if (company) companies.add(company);
                });
                return Array.from(companies);
            },
            key: 'company',
            mandatory: false,
            condition: (criteria) => criteria.employment === 'Job'
        },
        {
            question: 'Select role',
            type: 'select',
            options: async () => {
                const snapshot = await db.collection('users').get();
                const roles = new Set();
                snapshot.forEach(doc => {
                    const role = doc.data().role;
                    if (role) roles.add(role);
                });
                return Array.from(roles);
            },
            key: 'role',
            mandatory: false,
            condition: (criteria) => criteria.employment === 'Job'
        },
        // Business details
        {
            question: 'Select sector',
            type: 'select',
            options: async () => {
                const snapshot = await db.collection('users').get();
                const sectors = new Set();
                snapshot.forEach(doc => {
                    const sector = doc.data().sector;
                    if (sector) sectors.add(sector);
                });
                return Array.from(sectors);
            },
            key: 'sector',
            mandatory: false,
            condition: (criteria) => criteria.employment === 'Business'
        },
        {
            question: 'Select business type',
            type: 'select',
            options: async () => {
                const snapshot = await db.collection('users').get();
                const types = new Set();
                snapshot.forEach(doc => {
                    const type = doc.data().businessType;
                    if (type) types.add(type);
                });
                return Array.from(types);
            },
            key: 'businessType',
            mandatory: false,
            condition: (criteria) => criteria.employment === 'Business'
        }
    ];

    const container = document.getElementById('filterSteps');
    if (currentStep >= steps.length) {
        await performFilterSearch(filterCriteria);
        return;
    }

    const step = steps[currentStep];
    // Skip if condition not met
    if (step.condition && !step.condition(filterCriteria)) {
        currentStep++;
        renderFilterStep();
        return;
    }

    let optionsHtml = '';
    if (step.type === 'select') {
        let options = step.options;
        if (typeof options === 'function') {
            options = await options(filterCriteria);
        }
        optionsHtml = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }

    // Build the step HTML
    container.innerHTML = `
        <div class="filter-step">
            <label>${step.question}</label>
            ${step.type === 'select' ? `<select id="filterSelect">${optionsHtml}</select>` : ''}
            ${step.type === 'radio' ? `
                <div class="radio-group">
                    ${step.options.map(opt => `<label><input type="radio" name="filterRadio" value="${opt}"> ${opt}</label>`).join('')}
                </div>
            ` : ''}
        </div>
        <div class="filter-actions">
            ${currentStep > 0 ? '<button class="secondary" id="filterPrev">Previous</button>' : ''}
            ${!step.mandatory ? '<button class="secondary" id="filterSkip">Skip</button>' : ''}
            <button class="primary" id="filterNext">Select</button>
        </div>
    `;

    // Previous button handler
    if (currentStep > 0) {
        document.getElementById('filterPrev').addEventListener('click', () => {
            currentStep--;
            renderFilterStep();
        });
    }

    // Skip button handler (only for non‑mandatory steps)
    if (!step.mandatory) {
        document.getElementById('filterSkip').addEventListener('click', () => {
            currentStep++;
            renderFilterStep();
        });
    }

    // Next button handler
    document.getElementById('filterNext').addEventListener('click', () => {
        let value = null;
        if (step.type === 'select') {
            value = document.getElementById('filterSelect').value;
        } else if (step.type === 'radio') {
            const selected = document.querySelector('input[name="filterRadio"]:checked');
            value = selected ? selected.value : null;
        }
        if (value) {
            filterCriteria[step.key] = value;
        }
        currentStep++;
        renderFilterStep();
    });
}

async function performFilterSearch(criteria) {
    const container = document.getElementById('filterSteps');
    container.innerHTML = '<p>Searching...</p>';

    let query = db.collection('users');
    // Apply filters that exist
    if (criteria.university) query = query.where('university', '==', criteria.university);
    if (criteria.department) query = query.where('department', '==', criteria.department);
    if (criteria.major) query = query.where('major', '==', criteria.major);
    if (criteria.batch) query = query.where('batch', '==', criteria.batch);
    if (criteria.employment) {
        if (criteria.employment === 'Job') {
            query = query.where('employment', '==', 'job');
            if (criteria.company) query = query.where('company', '==', criteria.company);
            if (criteria.role) query = query.where('role', '==', criteria.role);
        } else if (criteria.employment === 'Business') {
            query = query.where('employment', '==', 'business');
            if (criteria.sector) query = query.where('sector', '==', criteria.sector);
            if (criteria.businessType) query = query.where('businessType', '==', criteria.businessType);
        } else if (criteria.employment === 'None') {
            query = query.where('employment', '==', 'none');
        }
    }

    try {
        const snapshot = await query.get();
        if (snapshot.empty) {
            container.innerHTML = '<p>Sorry, no match has been found.</p><button class="primary" onclick="location.reload()">Close</button>';
        } else {
            let resultsHtml = '<h4>Results:</h4><div class="filter-results">';
            snapshot.forEach(doc => {
                const user = doc.data();
                resultsHtml += `
                    <div class="filter-result-item" data-userid="${doc.id}">
                        <img src="${user.profilePicURL || 'https://placehold.co/40'}" alt="Profile">
                        <span>${user.firstName || ''} ${user.lastName || ''}</span>
                    </div>
                `;
            });
            resultsHtml += '</div><button class="secondary" onclick="location.reload()">Close</button>';
            container.innerHTML = resultsHtml;

            document.querySelectorAll('.filter-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const userId = item.dataset.userid;
                    window.location.href = `people-profile.html?uid=${userId}`;
                });
            });
        }
    } catch (error) {
        console.error('Filter search error:', error);
        container.innerHTML = '<p>Error performing search. Please try again.</p>';
    }
}