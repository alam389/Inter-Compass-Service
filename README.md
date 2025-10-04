# Inter-Compass Service

A basic Express.js backend service for the Inter-Compass application.

## Features

- Express.js server with TypeScript
- CORS enabled
- Basic API endpoints
- Health check endpoint
- Error handling
- Environment variable support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api/test` - Test GET endpoint
- `POST /api/test` - Test POST endpoint

## Development

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Future Enhancements

- Database integration
- Authentication middleware
- More API endpoints
- Input validation
- Logging

