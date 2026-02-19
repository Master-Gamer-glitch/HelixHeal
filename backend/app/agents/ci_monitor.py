from agno.agent import Agent
from app.models import CITimepoint
from datetime import datetime

class CIMonitorAgent:
    def __init__(self):
        self.agent = Agent(
            role="CI Monitor",
            instructions="You are a DevOps engineer. Check the CI status of the branch.",
        )

    def check_status(self, iteration: int) -> CITimepoint:
        # In a real scenario, this would poll GitHub Actions API or similar.
        # For this hackathon/MVP, we might just report the result of our local test run
        # as the "CI Status".
        
        return CITimepoint(
            iteration=iteration,
            status="PENDING", # Updated by test runner result
            timestamp=datetime.utcnow()
        )
