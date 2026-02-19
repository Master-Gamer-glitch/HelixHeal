import os
import shutil
import git
from pathlib import Path
from typing import List

def clone_repository(repo_url: str, target_dir: str):
    """Clones a git repository to a target directory."""
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    os.makedirs(target_dir, exist_ok=True)
    return git.Repo.clone_from(repo_url, target_dir)

def create_branch(repo_path: str, branch_name: str):
    """Creates and checks out a new branch."""
    repo = git.Repo(repo_path)
    current = repo.create_head(branch_name)
    current.checkout()
    return current

def commit_changes(repo_path: str, message: str, files: List[str] = None):
    """Commits changes to the current branch."""
    repo = git.Repo(repo_path)
    if files:
        repo.index.add(files)
    else:
        repo.index.add(["."])
    
    repo.index.commit(message)
    return repo.head.commit.hexsha

def push_changes(repo_path: str, github_token: str):
    """Pushes changes to the remote repository using the provided token."""
    repo = git.Repo(repo_path)
    origin = repo.remote(name='origin')
    
    # Construct auth URL
    remote_url = origin.url
    if "https://" in remote_url and github_token:
        auth_url = remote_url.replace("https://", f"https://{github_token}@")
        with repo.git.custom_environment(GIT_ASKPASS='echo', GIT_TERMINAL_PROMPT='0'):
             origin.set_url(auth_url)
             try:
                 origin.push(repo.active_branch.name)
             finally:
                 # Restore original URL to avoid leaking token in local config
                 origin.set_url(remote_url)
    else:
        # Fallback for SSH or no token (might fail if auth needed)
        origin.push(repo.active_branch.name)

def get_repo_structure(repo_path: str) -> List[str]:
    """Returns a list of files in the repository."""
    file_list = []
    for root, dirs, files in os.walk(repo_path):
        if '.git' in dirs:
            dirs.remove('.git')
        for file in files:
            file_list.append(os.path.join(root, file))
    return file_list
