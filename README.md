# InternCompass API

A comprehensive FastAPI-based backend service for the InternCompass internship management platform.

## Features

- **User Management**: User registration, authentication, and profile management
- **Internship Management**: Create, search, and manage internship postings
- **Application System**: Apply to internships and track application status
- **RESTful API**: Well-documented API with automatic OpenAPI/Swagger documentation
- **Database Support**: SQLAlchemy ORM with support for SQLite, PostgreSQL, and MySQL
- **Security**: JWT-based authentication and password hashing
- **CORS Support**: Configured for frontend integration

## Quick Start

### Prerequisites

- Python 3.8+
- pip or pipenv

### Installation

1. **Clone and navigate to the service directory:**
   ```bash
   cd Inter-Compass-Service
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application:**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/v1/openapi.json`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get access token
- `POST /api/v1/auth/test-token` - Test access token

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/{user_id}` - Get user by ID
- `GET /api/v1/users/` - List all users

### Internships
- `POST /api/v1/internships/` - Create new internship
- `GET /api/v1/internships/` - List all internships
- `GET /api/v1/internships/search` - Search internships
- `GET /api/v1/internships/{internship_id}` - Get internship by ID
- `PUT /api/v1/internships/{internship_id}` - Update internship
- `DELETE /api/v1/internships/{internship_id}` - Delete internship

### Applications
- `POST /api/v1/applications/` - Create new application
- `GET /api/v1/applications/` - List user's applications
- `GET /api/v1/applications/{application_id}` - Get application by ID
- `PUT /api/v1/applications/{application_id}` - Update application
- `DELETE /api/v1/applications/{application_id}` - Delete application

## Database

The application uses SQLAlchemy ORM and supports multiple database backends:

- **SQLite** (default): `sqlite:///./interncompass.db`
- **PostgreSQL**: `postgresql://user:password@localhost/dbname`
- **MySQL**: `mysql://user:password@localhost/dbname`

Update the `DATABASE_URL` in your `.env` file to use a different database.

## Development

### Project Structure

```
Inter-Compass-Service/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       └── api.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── crud/
│   ├── models/
│   ├── schemas/
│   └── main.py
├── requirements.txt
├── run.py
└── README.md
```

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black .
isort .
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_NAME` | Project name | "InternCompass API" |
| `VERSION` | API version | "1.0.0" |
| `SECRET_KEY` | JWT secret key | Auto-generated |
| `DATABASE_URL` | Database connection string | "sqlite:///./interncompass.db" |
| `REDIS_URL` | Redis connection string | "redis://localhost:6379" |
| `BACKEND_CORS_ORIGINS` | CORS allowed origins | ["http://localhost:3000", ...] |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | 10080 (7 days) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
