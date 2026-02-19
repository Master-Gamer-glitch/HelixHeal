from agno.agent import Agent
from app.models import FixProposal, CommitDetails
from app.utils import commit_changes
import os
from typing import Optional

class CommitAgent:
    def __init__(self):
        self.agent = Agent(
            role="Commit Agent",
            instructions="You are a meticulous developer. Apply the provided fix to the codebase and commit the changes.",
        )

    def apply_fix(self, fix: FixProposal, repo_path: str, github_token: Optional[str] = None) -> CommitDetails:
        file_path = os.path.join(repo_path, fix.file)
        
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Apply the fix (simple string replacement for now)
        # In production, use diff/patch or more robust search/replace
        if fix.original_code in content:
            new_content = content.replace(fix.original_code, fix.replacement_code)
            with open(file_path, 'w') as f:
                f.write(new_content)
        else:
            # Fallback or error handling
            # Maybe the line numbers shifted?
            pass

        # Commit
        commit_message = f"[AI-AGENT] Fix bug in {fix.file}"
        commit_hash = commit_changes(repo_path, commit_message, [fix.file])
        
        branch_name = "<current_branch>" # Placeholder, logic to get branch name needed or passed
        
        # Push if token provided
        if github_token:
            from app.utils import push_changes
            # key assumption: branch_name is available or pushed to current HEAD
            push_changes(repo_path, github_token)

        return CommitDetails(
            commit_hash=commit_hash,
            branch_name=branch_name,
            message=commit_message
        )
