"""
Simple API test script
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health check: {response.status_code}")
    print(f"Response: {response.json()}")

def test_root():
    """Test root endpoint"""
    response = requests.get(f"{BASE_URL}/")
    print(f"Root endpoint: {response.status_code}")
    print(f"Response: {response.json()}")

def test_register():
    """Test user registration"""
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    print(f"Registration: {response.status_code}")
    print(f"Response: {response.json()}")

def test_login():
    """Test user login"""
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    print(f"Login: {response.status_code}")
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"Token: {token[:20]}...")
        return token
    else:
        print(f"Response: {response.json()}")
        return None

def test_protected_endpoint(token):
    """Test protected endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/users/me", headers=headers)
    print(f"Protected endpoint: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    print("Testing InternCompass API...")
    print("=" * 50)
    
    test_health()
    print()
    
    test_root()
    print()
    
    test_register()
    print()
    
    token = test_login()
    print()
    
    if token:
        test_protected_endpoint(token)
    
    print("=" * 50)
    print("Test completed!")
