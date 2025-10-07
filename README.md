# GlowApp – Digital Booking Platform for Beauty Salons

GlowApp is a full-stack mobile and web application that connects beauty salons with clients through an intuitive digital booking system.
Developed as a bachelor’s thesis project, it aims to simplify appointment management, improve salon visibility, and enhance customer engagement using modern web technologies.

## Overview

GlowApp allows users to explore salons, book multiple services, and manage appointments — while salon owners can organize schedules, manage clients, and promote their services online.

### Roles
- Client – browses salons, books appointments, manages loyalty rewards, leaves reviews.
- Salon Owner (Partner) – manages salon details, services, schedule, and customer appointments.

## Key Features

### For Clients
- User registration and secure authentication
- Multi-service appointment booking
- Salon search with photos, reviews, and ratings
- Loyalty program (Silver / Gold / Diamond tiers)
- Real-time availability and calendar scheduling
- Push and email notifications

### For Salon Owners
- Salon registration and dashboard access
- Manage services, prices, and schedules
- Upload salon logos and photo galleries
- View and update appointments in real time
- Automatic updates via Google Places API
- Email and push reminders for reviews

## Tech Stack

| Layer | Technologies |
|-------|---------------|
| Frontend | React Native (Expo), Tailwind CSS, Reanimated, Ionicons |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Server OS | Debian GNU/Linux |
| Integrations | Google Places API, Resend API, Expo Notifications |
| Automation | Cron Jobs for scheduled updates and review reminders |
| Security | HTTPS, SSL/TLS certificates |
| Version Control | Git, GitHub |

## System Architecture

React Native (Expo) / Web
        ↓
     Express API
        ↓
     MySQL Database
        ↓
   External APIs
(Google Places, Resend, Expo)

## Main Modules

- Authentication – JWT token-based login and registration
- Home – Displays featured salons and search filters
- Salon Details – Photos, weekly schedule, and categorized services
- Booking – Multi-service booking flow with duration calculation
- Loyalty – Dynamic card system and voucher display
- Salon Manager – Manage salon info, working hours, and uploaded images
- ProgramariSalon – Visual schedule of appointments by department

## Database Overview

Key tables:
- Users – clients and partners
- Partners – salon information
- Departments – salon service categories
- Services – service details and pricing
- Appointments – scheduled bookings
- AppointmentServices – linking appointments to multiple services
- Loyalty – user points and voucher rewards

## API Endpoints (Examples)

### GET /salondata/:id
Fetch complete salon details (schedule, services, images, reviews).

### POST /programare
Create a new appointment with multiple selected services.

### PUT /programsalon/:id
Update salon working hours from the Salon Manager dashboard.

### GET /programarisalon
Retrieve salon appointments by date and department.

## Installation

### Prerequisites
- Node.js v18+
- MySQL
- Expo CLI

### Steps
git clone https://github.com/yourusername/glowapp.git
cd glowapp

npm install

Configure environment variables (.env)
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=glowapp

Start backend
node server.js

Start mobile app
npx expo start

## Notifications & Integrations

- Resend API: automatic email confirmations and reminders
- Expo Push Notifications: client alerts and review follow-ups
- Google Places API: salon details, address link, and review synchronization

## Example Screens

- Home page – salon tiles with logos and preview images
- Salon details – weekly schedule and department-based services
- Booking page – multi-service selection and time availability
- Loyalty page – reward tiers and available vouchers
- Salon Manager – dashboard for editing services, schedule, and gallery

## Future Improvements

- AI-based service recommendations based on user preferences
- Integration with Google Calendar or Apple Calendar
- Advanced analytics dashboard for salon performance
- In-app payments and billing management
- Support for multiple languages

## Conclusion

GlowApp demonstrates the power of modern full-stack development applied to the beauty industry.
It bridges clients and salons in a single, efficient ecosystem by combining mobile accessibility, smart automation, and real-time data integration.

## Author

Adrian-Gabriel Boșnegeanu
Bachelor’s Thesis – Technical University of Civil Engineering of Bucharest (2025)
Title: Development of a Mobile Information Platform for Beauty Salons (GlowApp)
Email: bosne28@gmail.com
LinkedIn: https://www.linkedin.com/in/gabibosne
Website: https://www.glowapp.ro
