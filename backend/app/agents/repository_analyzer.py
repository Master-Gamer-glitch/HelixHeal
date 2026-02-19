from agno.agent import Agent
from app.models import AnalysisResult
from app.utils import clone_repository
import os
import json

class RepositoryAnalyzerAgent:
    def __init__(self):
        self.agent = Agent(
            role="Repository Analyzer",
            instructions="You are an expert software architect. Analyze the repository structure to identify the language, framework, test framework, and dependencies.",
        )

    def analyze(self, repo_url: str, clone_path: str) -> AnalysisResult:
        # Clone the repository
        print(f"Cloning {repo_url} to {clone_path}...")
        clone_repository(repo_url, clone_path)

        # Basic heuristic analysis (can be enhanced with LLM if needed)
        language = "Unknown"
        framework = "Unknown"
        test_framework = "Unknown"
        dependencies = []

        # Check for common files at repo root
        files = os.listdir(clone_path)
        
        if "requirements.txt" in files or "setup.py" in files or "pyproject.toml" in files:
            language = "Python"
            if "manage.py" in files:
                framework = "Django"
            elif "app.py" in files or "main.py" in files:
                framework = "FastAPI/Flask"
            test_framework = "pytest"

        elif "package.json" in files:
            language = "Node.js"
            test_framework = "Jest"
            try:
                with open(os.path.join(clone_path, "package.json"), 'r') as f:
                    data = json.load(f)
                    deps = data.get("dependencies", {})
                    dependencies = list(deps.keys())
                    if "react" in deps:
                        framework = "React"
                    elif "express" in deps:
                        framework = "Express"
                    elif "next" in deps:
                        framework = "Next.js"
            except:
                pass

        # Fallback: walk the repo tree and count source files
        if language == "Unknown":
            py_count = 0
            js_count = 0
            for root, dirs, walked_files in os.walk(clone_path):
                # Skip hidden directories and common non-source dirs
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('node_modules', '__pycache__', '.git', 'venv', 'env')]
                for f in walked_files:
                    if f.endswith('.py'):
                        py_count += 1
                    elif f.endswith(('.js', '.ts', '.jsx', '.tsx')):
                        js_count += 1

            if py_count >= js_count and py_count > 0:
                language = "Python"
                test_framework = "pytest"
                print(f"[Analyzer] Detected Python via {py_count} .py files")
            elif js_count > 0:
                language = "Node.js"
                test_framework = "Jest"
                print(f"[Analyzer] Detected Node.js via {js_count} JS/TS files")
            else:
                print("[Analyzer] Could not detect language — no source files found")

        print(f"[Analyzer] Language={language}, Framework={framework}, TestFW={test_framework}")
        return AnalysisResult(
            language=language,
            framework=framework,
            test_framework=test_framework,
            dependencies=dependencies,
            root_dir=clone_path
        )

