"""
Performance/Load tests using Locust
"""
from locust import HttpUser, task, between

class ReplyXUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup before tests"""
        pass
    
    @task(3)
    def test_health_endpoint(self):
        """Test health endpoint load"""
        response = self.client.get("/health")
        
    @task(1) 
    def test_api_endpoint(self):
        """Test main API endpoint load"""
        response = self.client.get("/api/health")