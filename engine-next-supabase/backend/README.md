# Next Supabase Engine - Backend

This is the backend service for the Next Supabase Engine project. It is built with **Node.js, Express, and TypeScript** and designed to handle API requests, user authentication, and integrations with different AI services.

## Features

- **Express.js API server**: Fast and minimalist web framework for Node.js.
- **TypeScript**: Typed superset of JavaScript for better maintainability and error tracking.
- **Authentication**: JWT & `bcryptjs` based user authentication.
- **Supabase Integration**: Data handling using `@supabase/supabase-js`.
- **AI Integrations**: Built-in support for multiple AI providers:
  - OpenAI (`openai`)
  - Google Generative AI (`@google/generative-ai`)
  - Groq (`groq-sdk`)

## Prerequisites

- **Node.js** (v18+)
- **npm** or **yarn**

## Environment Variables

To run this backend, you will need to add the following environment variables. Copy the `.env.example` file to `.env` and fill in the required values.

```bash
cp .env.example .env
```

## Available Scripts

In the project directory, you can run:

### `npm run dev`
Runs the app in the development mode using `nodemon` and `ts-node`.
The server will reload if you make edits.

### `npm run build`
Compiles the TypeScript code to JavaScript into the `dist` folder.

### `npm start`
Starts the compiled Node.js application from the `dist` folder. Make sure you have run `npm run build` before using this command.

## Core Packages

- `express` & `cors` - Web framework and cross-origin resource sharing.
- `dotenv` - Environment variable management.
- `@supabase/supabase-js` - Supabase client.
- `openai`, `@google/generative-ai`, `groq-sdk` - AI SDK integrations.
- `jsonwebtoken`, `bcryptjs` - Authentication handling.
- `axios` - Promise based HTTP client.
