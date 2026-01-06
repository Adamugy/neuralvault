# NeuralVault

Modern academic research and resource management platform.

## Features

- **Resource Board**: Manage links and files in a structured way.
- **Academic Helper**: Powered by Gemini AI to help with outlines, drafts, and refining academic texts.
- **Stripe Integration**: Professional plans for researchers.
- **Secure Authentication**: Integrated with Clerk.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, Prisma (PostgreSQL), Gemini AI API, Stripe API.
- **Infrastructure**: Docker, Cloud Run.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (optional)
- PostgreSQL database
- Clerk API keys
- Stripe API keys
- Gemini AI API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/neuralvault.git
   cd neuralvault
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables (see `.env.example`).

4. Run Prisma migrations:

   ```bash
   npm run prisma:migrate
   ```

5. Start the development server:

   ```bash
   npm run dev:full
   ```

## License

This project is private but can be licensed upon request.
