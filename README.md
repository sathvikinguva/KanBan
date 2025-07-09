# Kanban Board Application

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20App-blue?style=for-the-badge)](https://kanban---app.web.app)

A modern, feature-rich Kanban board application built with React, TypeScript, and Firebase for real-time collaboration and data persistence.

**Live Demo**: [https://kanban---app.web.app](https://kanban---app.web.app)

## Features

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Changes sync instantly across all devices
- **User Authentication**: Secure login with email verification
- **Dark/Light Theme**: Choose your preferred visual mode
- **Drag and Drop**: Intuitive card and list management
- **Role-based Permissions**: Different access levels (owner, editor, viewer)
- **Invitations System**: Collaborate with team members
- **Rich Card Details**: Add descriptions, comments, due dates, and assignees

## Tech Stack

- **Frontend**:
  - React 18
  - TypeScript
  - TailwindCSS for styling
  - Vite for fast development and building
  - React Router for navigation

- **Backend**:
  - Firebase Authentication
  - Firestore for database
  - Firebase Hosting for deployment

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/KanBan.git
   cd KanBan
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password) and Firestore
   - Copy your Firebase config details
   - Update the `firebase.ts` file with your Firebase configuration:
     ```typescript
     const firebaseConfig = {
       apiKey: "your-api-key",
       authDomain: "your-auth-domain",
       projectId: "your-project-id",
       storageBucket: "your-storage-bucket",
       messagingSenderId: "your-messaging-sender-id",
       appId: "your-app-id",
       measurementId: "your-measurement-id" // optional
     };
     ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
# or
yarn build
```

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select Firestore, Hosting, and Authentication
   - Choose your Firebase project
   - Set public directory to `dist` (Vite's default)
   - Configure as single-page app: Yes

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

After deployment, your app will be available at `https://your-project-id.web.app`. The current version is deployed at:
[https://kanban---app.web.app](https://kanban---app.web.app)

## Project Structure

```
kanban-board/
├── public/
├── src/
│   ├── components/      # UI Components
│   │   ├── AuthForm.tsx
│   │   ├── Board.tsx
│   │   ├── BoardList.tsx
│   │   ├── Card.tsx
│   │   ├── CardAssignees.tsx
│   │   ├── CardModal.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EmailVerification.tsx
│   │   ├── InviteModal.tsx
│   │   └── Navbar.tsx
│   ├── contexts/        # React Context Providers
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/           # Custom React Hooks
│   │   ├── useDragAndDrop.ts
│   │   └── usePermissions.ts
│   ├── services/        # API & Firebase Services
│   │   ├── auth.ts
│   │   └── firestore.ts
│   ├── types/           # TypeScript Types
│   │   └── index.ts
│   ├── utils/           # Helper Functions
│   │   ├── helpers.ts
│   │   └── storage.ts
│   ├── App.tsx          # Main App Component
│   ├── firebase.ts      # Firebase Configuration
│   ├── index.css        # Global styles
│   └── main.tsx         # Entry Point
├── index.html
├── firebase.json        # Firebase configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── README.md
```

## User Roles and Permissions

- **Owner**: Full access - can invite members, edit all content, and delete the board
- **Editor**: Can create/edit cards and lists, but cannot invite members or delete the board
- **Viewer**: Read-only access to view the board and all cards

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

## Acknowledgments

- [Lucide Icons](https://lucide.dev/) for beautiful icons
- [TailwindCSS](https://tailwindcss.com/) for utility-first CSS
- [Firebase](https://firebase.google.com/) for backend services
- [React](https://reactjs.org/) for the UI library
---
