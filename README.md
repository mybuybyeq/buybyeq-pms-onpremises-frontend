# PMS - Property Management System (Standalone)

A standalone Property Management System built with React and Vite.

## Features

- **Full Property Management**: Complete hotel/property management functionality
- **Booking & Reservations**: Handle reservations, check-ins, and check-outs
- **Guest Management**: Track guest information and history
- **Room Management**: Manage rooms, room types, and availability
- **Reports**: Generate occupancy, guest, and reservation reports
- **Security**: Role-based access control and user management
- **Theme Support**: Dark/Light theme with context providers

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

For standalone frontend development, copy `.env.example` to `.env` and update the API endpoint:

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:
```
VITE_PMS_API_BASE_URL=http://your-api-url
```

When the frontend is served by the compiled backend, it uses the same origin by default. Set the backend `PMS_API_BASE_URL` environment variable only when the API is hosted elsewhere. The backend exposes that optional override through `/runtime-config.js`.

### 3. Run Development Server

```bash
bun run dev
```

The app will start at `http://localhost:3000`

### 4. Build for Production

```bash
bun run build
```

The production build will be in the `dist` directory.

## Project Structure

```
src/
├── api/              # API configuration and axios setup
├── assets/           # Static assets (images, icons)
├── components/       # Reusable UI components
├── constants/        # App constants (theme, currency)
├── context/          # React contexts (Theme, Sidebar, Tab)
├── layout/           # Layout components (BaseLayout)
├── screens/          # Page components organized by feature
│   ├── bookings-and-status/
│   ├── dashboard/
│   ├── guests/
│   ├── loginsignup/
│   ├── maintenance/
│   ├── reception/
│   ├── reports/
│   ├── reservations/
│   └── settings/
├── App.jsx           # Main PMS application component
├── App.scss          # Global styles
└── main.jsx          # Entry point with router setup
```

## Authentication

The PMS uses session-based authentication:
- Login status stored in `sessionStorage.ispmsuser`
- User data stored in `sessionStorage.userData`
- Unauthenticated users redirected to `/login`

## Main Routes

- `/` - Dashboard
- `/login` - Login page
- `/property/*` - Property management
- `/security/*` - User roles and permissions
- `/reservations/*` - Booking and availability
- `/reception/*` - Reception desk operations
- `/bookings/*` - Booking status views
- `/reports/*` - Various reports
- `/settings/*` - Configuration and settings

## Dependencies

Key dependencies:
- React 18+
- React Router DOM 6+
- React Icons
- Axios (API calls)
- Recharts (charts and analytics)
- Date-fns (date handling)
- React DatePicker & Date Range

See `package.json` for complete list.

## Notes

- The app requires SCSS support (included via Vite)
- Configure your backend API endpoint in the `.env` file
- Default port is 3000 (configurable in `vite.config.js`)

