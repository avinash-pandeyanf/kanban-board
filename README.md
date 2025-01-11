# Kanban Board Application

A modern Kanban board application built with Vue.js and Node.js.

## Features

- Create, update, and delete tasks
- Drag and drop tasks between sections
- Add new sections
- Real-time updates
- Responsive design

## Tech Stack

### Frontend
- Vue.js 3
- Vuedraggable
- Axios
- Modern UI/UX design

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

## Setup Instructions

### Prerequisites
- Node.js
- MongoDB
- Git

### Backend Setup
1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file based on .env.example:
```bash
cp .env.example .env
```

4. Update .env with your MongoDB URI and other configurations

5. Start the server:
```bash
npm start
```

### Frontend Setup
1. Navigate to frontend directory:
```bash
cd frontend/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file:
```bash
cp .env.example .env
```

4. Update .env with your backend API URL

5. Start the development server:
```bash
npm run serve
```

## Deployment

### Backend Deployment (Render)
1. Sign up at render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Set environment variables from .env
5. Deploy

### Frontend Deployment (Vercel)
1. Sign up at vercel.com
2. Import your GitHub repository
3. Set environment variables
4. Deploy

