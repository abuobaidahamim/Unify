# 🎓 UNIFY – University-Centric Alumni & Student Networking Platform

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**Unify** is a dedicated, real-time web platform designed exclusively for the **Daffodil International University (DIU)** community. It bridges the gap between current students and alumni, facilitating seamless mentorship, career guidance, and professional networking in a secure, noise-free environment.

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started (Installation)](#-getting-started)
- [Future Road Map](#-future-roadmap)
- [Contributors](#-contributors)

---

## 🚀 About the Project
Current students often face significant hurdles when trying to find and connect with university alumni working in specific companies or specialized fields. General social media platforms are too broad and unstructured for targeted university networking.

**Unify** solves this by centralizing the DIU family into one searchable, interactive directory. By restricting access strictly to verified `@diu.edu.bd` emails, Unify ensures a safe, authentic, and highly relevant professional community where success stories are shared and vital mentorship connections are made.

---

## ✨ Key Features
* **🔒 Exclusive Access:** Strict authentication ensuring only users with a valid `@diu.edu.bd` email domain can register and log in.
* **🔍 Smart Search & Directory:** Advanced filtering capabilities allowing users to find peers or mentors by Batch, Department, Major, Company, or Job Role.
* **💬 Real-Time Messaging:** Instant private text and image messaging between connected users with zero page reloads.
* **🌐 Global Journey Feed:** A public feed where alumni and students can publish posts with images to share career milestones and experiences.
* **🛡️ Admin Moderation:** Elevated privilege dashboard for administrators to monitor content, delete vulgar posts, and ban abusive accounts.
* **📱 Fully Responsive:** A fluid, mobile-first UI designed without heavy CSS frameworks.

---

## 🛠️ Tech Stack
Unify was built with a conscious decision to avoid heavy frontend frameworks, relying instead on a highly optimized, lightweight stack to ensure speed and code maintainability:

**Frontend:**
* HTML5 & CSS3 (Custom Styling, Flexbox/Grid)
* Vanilla JavaScript (ES6+, DOM Manipulation)

**Backend & Database:**
* **Google Firebase Auth:** Secure user session management.
* **Google Firestore (NoSQL):** Real-time data syncing using `onSnapshot` and complex composite querying.

**Third-Party APIs:**
* **ImgBB REST API:** Offloads media storage to prevent database bloat, returning lightweight hosted image URLs for chats and posts.

---

## ⚙️ System Architecture
Unify operates on a Serverless Architecture utilizing Firebase as a Backend-as-a-Service (BaaS). 
1. The **Client (Vanilla JS)** interacts directly with Firebase Authentication to verify university domains.
2. Image uploads bypass the database and are `POST`ed directly to the **ImgBB API**.
3. Text data and resulting image URLs are written to the **Firestore NoSQL Database**, which pushes real-time WebSocket updates back to the client UI.

---

## 💻 Getting Started

To run the Unify project locally on your machine, follow these steps:

### Prerequisites
* A modern web browser (Chrome, Edge, Firefox, etc.)
* [Visual Studio Code (VS Code)](https://code.visualstudio.com/)
* VS Code Extension: **Live Server** (by Ritwick Dey)

### Installation
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/unify-networking-platform.git](https://github.com/your-username/unify-networking-platform.git)
