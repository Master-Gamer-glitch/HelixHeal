import docker
import os
from agno.agent import Agent
from app.models import TestResult, TestFailure
from app.models import AnalysisResult

class TestRunnerAgent:
    def __init__(self):
        self.client = None  # Lazy-initialized on first use
        self.agent = Agent(
            role="Test Runner",
            instructions="You are a QA engineer. Run the tests in the provided environment and report the results.",
        )

    def _get_client(self):
        if self.client is None:
            try:
                self.client = docker.from_env()
            except Exception as e:
                raise RuntimeError(
                    f"Docker is not available. Please ensure Docker Desktop is running. Details: {e}"
                )
        return self.client

    def run_tests(self, repo_path: str, analysis: AnalysisResult) -> TestResult:
        # Define the image name
        image_name = "ai-agent-sandbox"
        client = self._get_client()

        # Build the image if it doesn't exist
        try:
            client.images.get(image_name)
        except docker.errors.ImageNotFound:
            print("Building sandbox image...")
            # Assuming Dockerfile is in ../../docker relative to this file
            docker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../docker"))
            client.images.build(path=docker_path, tag=image_name)

        # distinct test commands
        command = ""
        if analysis.language == "Python":
            # Always install pytest, try requirements.txt if it exists, then run tests verbosely
            command = (
                "pip install -q pytest && "
                "(pip install -q -r requirements.txt 2>/dev/null || true) && "
                "pytest --tb=short -v 2>&1"
            )
        elif analysis.language == "Node.js":
            command = "npm install && npm test 2>&1"
        else:
            # Fallback
            return TestResult(passed=False, failures=[], raw_output="Unsupported language for testing")

        try:
            container = client.containers.run(
                image_name,
                command=f"/bin/bash -c '{command}'",
                volumes={repo_path: {'bind': '/app', 'mode': 'rw'}},
                working_dir="/app",
                detach=True,
            )
            
            result = container.wait()
            logs = container.logs().decode('utf-8')
            container.remove()
            
            print(f"[TestRunner] Exit code: {result['StatusCode']}")
            print(f"[TestRunner] Output:\n{logs[-3000:]}")  # Last 3000 chars for debugging
            
            passed = result['StatusCode'] == 0
            failures = self._parse_failures(logs, analysis.language)

            # If tests failed but parser found nothing, create a generic failure
            # from the raw output so the bug classifier can still try to classify it
            if not passed and not failures:
                failures = [TestFailure(
                    file="unknown",
                    message=logs[-500:].strip() if logs.strip() else "Tests failed with no parseable output"
                )]
            
            return TestResult(
                passed=passed,
                failures=failures,
                raw_output=logs
            )

        except Exception as e:
            return TestResult(
                passed=False,
                failures=[TestFailure(file="system", message=str(e))],
                raw_output=str(e)
            )

    def _parse_failures(self, logs: str, language: str) -> list[TestFailure]:
        failures = []
        if language == "Python":
            lines = logs.split('\n')
            for line in lines:
                stripped = line.strip()

                # Format 1: "FAILED tests/test_foo.py::test_bar - AssertionError"
                if stripped.startswith("FAILED ") and "::" in stripped:
                    rest = stripped[len("FAILED "):].strip()
                    # rest = "tests/test_foo.py::test_bar - AssertionError"
                    parts = rest.split(" - ", 1)
                    file_parts = parts[0].split("::", 1)
                    file = file_parts[0].strip()
                    message = (parts[1].strip() if len(parts) > 1 else
                               file_parts[1].strip() if len(file_parts) > 1 else rest)
                    failures.append(TestFailure(file=file, message=message))

                # Format 2: "ERROR tests/test_foo.py - ModuleNotFoundError: ..."
                # Also: "ERROR collecting tests/test_foo.py"
                elif stripped.startswith("ERROR ") and ".py" in stripped:
                    rest = stripped[len("ERROR "):].strip()
                    # Handle "collecting tests/test_foo.py"
                    if rest.startswith("collecting "):
                        rest = rest[len("collecting "):]
                    # rest is now "tests/test_foo.py - SomeError" or "tests/test_foo.py"
                    parts = rest.split(" - ", 1)
                    file = parts[0].strip()
                    message = parts[1].strip() if len(parts) > 1 else f"Collection error in {file}"
                    failures.append(TestFailure(file=file, message=message))

        elif language == "Node.js":
            lines = logs.split('\n')
            for line in lines:
                stripped = line.strip()
                if "failing" in stripped.lower() or "✗" in stripped or "× " in stripped:
                    failures.append(TestFailure(file="test", message=stripped))
        return failures


