from agno.agent import Agent
from app.models import BugAnalysis, BugType, TestResult

class BugClassifierAgent:
    def __init__(self):
        self.agent = Agent(
            role="Bug Classifier",
            instructions="""You are a senior debugger. Analyze the test failure log and classify the bug.
            Return a JSON object with:
            - bug_type: One of [LINTING, SYNTAX, LOGIC, TYPE_ERROR, IMPORT, INDENTATION]
            - description: Brief description of the error
            - location: file:line where the error occurred
            - context_code: The snippet of code causing the error (if available in logs)
            """
        )

    def classify(self, test_result: TestResult) -> list[BugAnalysis]:
        analyses = []
        if test_result.passed:
            return analyses

        # For each failure, ask the LLM to classify it
        # In a real implementation, we'd batch this or use a more efficient prompt
        
        # Simple heuristic fallback if LLM is not connected or for speed
        for failure in test_result.failures:
            bug_type = BugType.UNKNOWN
            msg = failure.message.lower()
            
            if "syntax" in msg:
                bug_type = BugType.SYNTAX
            elif "import" in msg or "module not found" in msg:
                bug_type = BugType.IMPORT
            elif "indent" in msg:
                bug_type = BugType.INDENTATION
            elif "type" in msg:
                bug_type = BugType.TYPE_ERROR
            elif "assert" in msg:
                bug_type = BugType.LOGIC
            
            analyses.append(BugAnalysis(
                bug_type=bug_type,
                description=failure.message,
                location=failure.file,
                context_code="" 
            ))
            
        return analyses
