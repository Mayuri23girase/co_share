# ⚡ Akatsuki's Draft: AI-Enabled Content Sharing Platform

A production-grade, highly scalable backend built with **Node.js**, **Express**, **MongoDB (Mongoose)**, **JWT Authentication**, and the official **Google Gemini API (`@google/genai`)** for AI content polishing and document processing.

---

## 📖 Table of Contents
- [Tech Stack](#-tech-stack)
- [Architecture & Design Principles](#-architecture--design-principles)
- [Folder Structure](#-folder-structure)
- [Database Schemas](#-database-schemas)
- [Setup & Installation](#-setup--installation)
- [Environment Configuration](#-environment-configuration)
- [Seeding Admin Account](#-seeding-admin-account)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Sample Requests & Responses](#-sample-requests--responses)
- [End-to-End Test Flow Checklist](#-end-to-end-test-flow-checklist)
- [Postman & REST Client Collections](#-postman--rest-client-collections)

---

## 🛠 Tech Stack
- **Runtime & Framework:** Node.js (v20+) with Express (ES Modules)
- **Database:** MongoDB with Mongoose ODM
- **Security & Authentication:** JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
- **AI Integration:** Official Google GenAI SDK (`@google/genai`) utilizing `gemini-3.8-flash` with structured JSON output and document processing
- **Validation:** `express-validator` for strict schema and parameter verification
- **File Uploads:** `multer` for memory-buffered document processing (PDF, TXT, MD) and images
- **Logging & Utilities:** `morgan`, `cors`, `dotenv`

---

## 🏗 Architecture & Design Principles

1. **Consistent JSON API Contract:**
   All endpoints follow a deterministic structure:
   - Success:
     ```json
     {
       "success": true,
       "message": "Human-readable confirmation message",
       "data": { ... }
     }
     ```
   - Error:
     ```json
     {
       "success": false,
       "message": "Descriptive error message",
       "data": null,
       "errors": [ ... ]
     }
     ```
2. **Proper HTTP Status Codes:**
   - `200 OK`: Successful retrieval or update.
   - `201 Created`: Resource successfully created.
   - `400 Bad Request`: Input validation failed or invalid state transition.
   - `401 Unauthorized`: Missing, invalid, or expired JWT token, or incorrect login credentials.
   - `403 Forbidden`: Authenticated user lacks permission (non-owner or non-admin).
   - `404 Not Found`: Target entity not found or post not approved.
   - `409 Conflict`: Duplicate unique key (e.g., email already registered).
   - `500 Internal Server Error`: Unhandled server exception.
3. **Strict Privilege & Data Isolation:**
   - User `role` is strictly assigned as `"user"` upon registration; request body cannot escalate privileges.
   - Post `createdBy` is populated directly from the verified JWT token (`req.user._id`), never from the request body.
   - Standard users can only create or edit posts with status `"draft"` or `"pending"`.
   - Admin routes require both a valid JWT and `role === "admin"`.
   - Editing an approved or rejected post automatically resets its status to `"draft"` or `"pending"`.
4. **AI Immutability & Document Processing:**
   - AI improvement analyzes the user's existing draft (along with optional uploaded context documents) and generates a **new** draft post.
   - The original post remains 100% untouched.

---

## 📁 Folder Structure

```
akatsuki-draft/
├── .env.example
├── .env
├── package.json
├── README.md
├── akatsuki-draft.postman_collection.json
├── requests.http
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & lifecycle management
│   ├── models/
│   │   ├── User.js               # User schema with bcrypt password hashing
│   │   └── Post.js               # Post schema with status workflow & text indexes
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, profile (me)
│   │   ├── postController.js     # CRUD for user drafts and approved public feed
│   │   ├── adminController.js    # Pending queue review, approve, reject
│   │   └── aiController.js       # Gemini content improvement logic
│   ├── routes/
│   │   ├── authRoutes.js         # /auth routes
│   │   ├── postRoutes.js         # /posts routes (my-posts defined before /:id)
│   │   ├── adminRoutes.js        # /admin routes
│   │   └── aiRoutes.js           # /ai routes
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & req.user injection
│   │   ├── roleMiddleware.js     # Admin role authorization guard
│   │   ├── validate.js           # express-validator rules and runner
│   │   ├── uploadMiddleware.js   # Multer in-memory upload (PDF, text, images)
│   │   └── errorHandler.js       # Centralized error handler & 404 handler
│   ├── utils/
│   │   ├── apiResponse.js        # Standardized { success, message, data } helper
│   │   ├── asyncHandler.js       # Promise rejection wrapper for controllers
│   │   └── gemini.js             # Official @google/genai SDK integration
│   ├── scripts/
│   │   └── seedAdmin.js          # Admin account seed script (npm run seed:admin)
│   ├── app.js                    # Express app configuration & middleware
│   └── server.js                 # HTTP server bootstrap & graceful shutdown
└── test/
    └── fullFlow.test.js          # End-to-end integration test suite
```

---

## 🗄 Database Schemas

### 1. User Schema (`src/models/User.js`)
| Field | Type | Attributes | Description |
|---|---|---|---|
| `name` | String | Required, Trimmed | Full name of the user |
| `email` | String | Required, Unique, Lowercase, Trimmed | User's email address |
| `password` | String | Required, Min 6 chars, `select: false` | Bcrypt hashed password |
| `role` | String | Enum: `["admin", "user"]`, Default: `"user"` | User authorization role |
| `createdAt` | Date | Auto-generated timestamp | Account creation date |
| `updatedAt` | Date | Auto-generated timestamp | Last account update date |

### 2. Post Schema (`src/models/Post.js`)
| Field | Type | Attributes | Description |
|---|---|---|---|
| `title` | String | Required, Trimmed, Max 200 | Title of the post |
| `description` | String | Required, Trimmed, Max 500 | Short summary/abstract |
| `content` | String | Required | Full post article body |
| `image` | String | Optional | URL or reference image path |
| `category` | String | Required, Trimmed, Lowercase | Category tag (e.g. `philosophy`) |
| `createdBy` | ObjectId | Ref: `'User'`, Required | Reference to the author |
| `status` | String | Enum: `["draft", "pending", "approved", "rejected"]`, Default: `"draft"` | Lifecycle state |
| `createdAt` | Date | Auto-generated timestamp | Post creation timestamp |
| `updatedAt` | Date | Auto-generated timestamp | Last post update timestamp |

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js:** v20.x or higher
- **MongoDB:** A running MongoDB instance locally or a MongoDB Atlas cluster URI.

### 2. Clone / Navigate to Project
```bash
cd akatsuki-draft
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/akatsuki_draft
JWT_SECRET=supersecret_jwt_key_akatsuki_draft_2026_change_in_production
JWT_EXPIRES_IN=7d

# Google Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Admin Seed Account
ADMIN_NAME=Akatsuki Leader
ADMIN_EMAIL=admin@akatsuki.dev
ADMIN_PASSWORD=AdminSecurePass123!
```

---

## 👑 Seeding Admin Account
Since the public registration endpoint (`POST /auth/register`) strictly sets `role: "user"` for security, use the automated seed script to initialize an admin account:

```bash
npm run seed:admin
```

This reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from your `.env` file, connects to MongoDB, hashes the password, and provisions the administrator account.

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/auth`)
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user (always role `user`) and return JWT |
| `POST` | `/auth/login` | Public | Verify credentials and return JWT |
| `GET` | `/auth/me` | Protected | Return logged-in user profile |

### 📝 User Post Management (`/posts`)
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/posts` | Protected | Create a post (status `"draft"` or `"pending"` only) |
| `GET` | `/posts` | Public | Retrieve approved posts (supports pagination, category & search) |
| `GET` | `/posts/my-posts` | Protected | Retrieve all drafts & posts belonging to the logged-in user |
| `GET` | `/posts/:id` | Public | Retrieve a single approved post (404 if draft, pending, or rejected) |
| `PATCH` | `/posts/:id` | Protected | Update own post (resets approved/rejected posts to draft/pending) |
| `DELETE` | `/posts/:id` | Protected | Delete own post |

### 🛡 Admin Moderation (`/admin`)
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/admin/posts/pending` | Admin Only | List all posts waiting for review (`status: "pending"`) |
| `PATCH` | `/admin/posts/approve/:id` | Admin Only | Approve a pending post (`status -> "approved"`) |
| `PATCH` | `/admin/posts/reject/:id` | Admin Only | Reject a pending post (`status -> "rejected"`) |

### 🤖 AI Content Improvement (`/ai`)
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/ai/improve/:postId` | Protected | Improve post using Gemini API; saves as a **new draft** while keeping original post untouched. Optionally accepts a reference document (`PDF` or `text`) via multipart/form-data. |

---

## 📦 Sample Requests & Responses

### 1. Register User (`POST /auth/register`)
**Request:**
```http
POST /auth/register HTTP/1.1
Content-Type: application/json

{
  "name": "Itachi Uchiha",
  "email": "itachi@akatsuki.dev",
  "password": "MangekyoPassword2026!"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "67be89f1d0a524a87b1c34a1",
      "name": "Itachi Uchiha",
      "email": "itachi@akatsuki.dev",
      "role": "user",
      "createdAt": "2026-10-27T17:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Create Post (`POST /posts`)
**Request:**
```http
POST /posts HTTP/1.1
Authorization: Bearer <USER_JWT_TOKEN>
Content-Type: application/json

{
  "title": "The Meaning of Peace",
  "description": "Exploration of peace and societal order.",
  "content": "True peace cannot exist without acknowledging pain and sacrifice...",
  "category": "philosophy",
  "status": "draft"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "post": {
      "_id": "67be89f5d0a524a87b1c34a5",
      "title": "The Meaning of Peace",
      "description": "Exploration of peace and societal order.",
      "content": "True peace cannot exist without acknowledging pain and sacrifice...",
      "category": "philosophy",
      "image": "",
      "createdBy": {
        "_id": "67be89f1d0a524a87b1c34a1",
        "name": "Itachi Uchiha",
        "email": "itachi@akatsuki.dev"
      },
      "status": "draft",
      "createdAt": "2026-10-27T17:31:00.000Z",
      "updatedAt": "2026-10-27T17:31:00.000Z"
    }
  }
}
```

---

### 3. Submit Post for Review (`PATCH /posts/:id`)
**Request:**
```http
PATCH /posts/67be89f5d0a524a87b1c34a5 HTTP/1.1
Authorization: Bearer <USER_JWT_TOKEN>
Content-Type: application/json

{
  "status": "pending"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "post": {
      "_id": "67be89f5d0a524a87b1c34a5",
      "title": "The Meaning of Peace",
      "status": "pending"
    }
  }
}
```

---

### 4. Admin Approve Post (`PATCH /admin/posts/approve/:id`)
**Request:**
```http
PATCH /admin/posts/approve/67be89f5d0a524a87b1c34a5 HTTP/1.1
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post approved successfully",
  "data": {
    "post": {
      "_id": "67be89f5d0a524a87b1c34a5",
      "title": "The Meaning of Peace",
      "status": "approved"
    }
  }
}
```

---

### 5. Public Approved Posts Feed (`GET /posts?page=1&limit=10&category=philosophy`)
**Request:**
```http
GET /posts?page=1&limit=10&category=philosophy HTTP/1.1
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Approved posts retrieved successfully",
  "data": {
    "totalPosts": 1,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 10,
    "posts": [
      {
        "_id": "67be89f5d0a524a87b1c34a5",
        "title": "The Meaning of Peace",
        "description": "Exploration of peace and societal order.",
        "content": "True peace cannot exist without acknowledging pain and sacrifice...",
        "category": "philosophy",
        "createdBy": {
          "_id": "67be89f1d0a524a87b1c34a1",
          "name": "Itachi Uchiha",
          "email": "itachi@akatsuki.dev"
        },
        "status": "approved"
      }
    ]
  }
}
```

---

### 6. AI Content Improvement (`POST /ai/improve/:postId`)
**Request:**
```http
POST /ai/improve/67be89f5d0a524a87b1c34a5 HTTP/1.1
Authorization: Bearer <USER_JWT_TOKEN>
```
*(Optional: attach document file as multipart form-data under field `document`)*

**Response (201 Created):**
```json
{
  "success": true,
  "message": "AI draft generated and saved successfully. The original post remains untouched.",
  "data": {
    "originalPostId": "67be89f5d0a524a87b1c34a5",
    "improvedDraft": {
      "_id": "67be8a12d0a524a87b1c34af",
      "title": "The Architecture of Enduring Peace: Empathy, Sacrifice, and Global Harmony",
      "description": "A profound philosophical examination exploring how shared vulnerability and mutual empathy form the cornerstone of sustainable peace.",
      "content": "Throughout human history, conflict has remained a perennial trial...",
      "category": "philosophy",
      "image": "",
      "createdBy": {
        "_id": "67be89f1d0a524a87b1c34a1",
        "name": "Itachi Uchiha",
        "email": "itachi@akatsuki.dev"
      },
      "status": "draft",
      "createdAt": "2026-10-27T17:35:00.000Z"
    }
  }
}
```

---

## ✅ End-to-End Test Flow Checklist

Follow this exact test sequence to verify the complete functional lifecycle:

| Step | Action | Endpoint | Expected Result |
|---|---|---|---|
| **1** | **Seed Admin** | `npm run seed:admin` | Admin account is provisioned from `.env` |
| **2** | **Register User** | `POST /auth/register` | Returns `201 Created`, user object (role: `"user"`), and JWT |
| **3** | **Login User** | `POST /auth/login` | Returns `200 OK` and user JWT token |
| **4** | **Check Profile** | `GET /auth/me` | Returns `200 OK` with user details |
| **5** | **Create Draft** | `POST /posts` | Accepts `status: "draft"`, returns `201 Created` |
| **6** | **Check Feed** | `GET /posts` | Returns `200 OK`, empty array or approved posts (the new draft is NOT visible) |
| **7** | **Submit for Review** | `PATCH /posts/:id` | Update `status: "pending"`, returns `200 OK` |
| **8** | **Check Pending as Admin** | `GET /admin/posts/pending` | Authenticated with Admin JWT, returns list including the pending post |
| **9** | **Approve Post** | `PATCH /admin/posts/approve/:id` | Status transitions to `"approved"`, returns `200 OK` |
| **10** | **Verify Public Feed** | `GET /posts` & `GET /posts/:id` | Approved post is now visible publicly in the feed and by ID |
| **11** | **AI Content Improvement** | `POST /ai/improve/:postId` | Gemini generates polished `{ title, description, content }` and saves as **new** draft post (`status: "draft"`, new `_id`) |
| **12** | **Verify Original Unchanged** | `GET /posts/:id` | Fetch original post by ID; confirms original post remains intact with status `"approved"` |
| **13** | **Ownership Protection** | `DELETE /posts/:id` / `PATCH` | Attempt editing or deleting another user's post -> rejected with `403 Forbidden` |

---

## 📬 Postman & REST Client Collections

- **Postman Collection:** Import [`akatsuki-draft.postman_collection.json`](file:///C:/Users/HP/.gemini/antigravity/scratch/akatsuki-draft/akatsuki-draft.postman_collection.json) directly into Postman. It includes pre-configured collection variables (`{{baseUrl}}`, `{{userToken}}`, `{{adminToken}}`, `{{postId}}`) and automatic token extraction scripts.
- **REST Client (`.http`):** Open [`requests.http`](file:///C:/Users/HP/.gemini/antigravity/scratch/akatsuki-draft/requests.http) in VS Code or JetBrains to execute calls directly against your running local server.
