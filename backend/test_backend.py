import unittest
import os
from fastapi.testclient import TestClient

# Set up test database or settings override if needed before importing
TEST_DB_PATH = "C:/tmp/video_summarizer_test.db"
os.makedirs(os.path.dirname(TEST_DB_PATH), exist_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

from app.main import app
from app.database import engine, Base

client = TestClient(app)

class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create fresh test database tables
        Base.metadata.create_all(bind=engine)

    @classmethod
    def tearDownClass(cls):
        # Clean up test database file
        Base.metadata.drop_all(bind=engine)
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except OSError:
                pass

    def test_health_check(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("status"), "healthy")

    def test_auth_cycle(self):
        # Register a test user
        register_payload = {
            "name": "Integration Tester",
            "email": "test@example.com",
            "password": "securepassword123"
        }
        
        response = client.post("/api/auth/register", json=register_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["name"], "Integration Tester")
        self.assertEqual(data["user"]["email"], "test@example.com")
        
        # Login
        login_payload = {
            "email": "test@example.com",
            "password": "securepassword123"
        }
        response = client.post("/api/auth/login", json=login_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        token = data["access_token"]
        
        # Profile fetch (Authenticated)
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "test@example.com")
        
        # Profile fetch (Unauthenticated / Bad token falls back to anonymous mode)
        bad_headers = {"Authorization": "Bearer badtoken123"}
        response = client.get("/api/auth/me", headers=bad_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "anonymous@localhost")

if __name__ == "__main__":
    unittest.main()
