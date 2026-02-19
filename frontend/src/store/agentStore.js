// Zustand store for agent state management
import { create } from 'zustand';

const STEPS = [
  'Cloning repository...',
  'Analyzing structure...',
  'Running tests...',
  'Classifying failures...',
  'Generating fixes...',
  'Committing & pushing...',
];

const useAgentStore = create((set, get) => ({
  // Form state
  repoUrl: '',
  teamName: '',
  teamLeader: '',
  githubToken: '',
  retryLimit: 5,

  // Job state
  jobId: null,
  status: 'idle', // idle | running | completed | failed
  result: null,
  pollInterval: null,
  elapsedTime: 0,
  elapsedInterval: null,

  setField: (field, value) => set({ [field]: value }),

  submitJob: async () => {
    const { repoUrl, teamName, teamLeader, githubToken, retryLimit } = get();
    set({ status: 'running', result: null, jobId: null, elapsedTime: 0 });

    // Start elapsed timer
    const elapsedInterval = setInterval(() => {
      set((s) => ({ elapsedTime: s.elapsedTime + 1 }));
    }, 1000);
    set({ elapsedInterval });

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          team_name: teamName,
          team_leader: teamLeader,
          github_token: githubToken || undefined,
          retry_limit: retryLimit,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      set({ jobId: data.job_id });
      get().startPolling(data.job_id);
    } catch (err) {
      const { elapsedInterval } = get();
      if (elapsedInterval) clearInterval(elapsedInterval);
      set({ status: 'failed', result: { error: err.message }, elapsedInterval: null });
    }
  },

  startPolling: (jobId) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        set({ result: data });
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(interval);
          const { elapsedInterval } = get();
          if (elapsedInterval) clearInterval(elapsedInterval);
          set({ status: data.status.toLowerCase(), pollInterval: null, elapsedInterval: null });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
    set({ pollInterval: interval });
  },

  reset: () => {
    const { pollInterval, elapsedInterval } = get();
    if (pollInterval) clearInterval(pollInterval);
    if (elapsedInterval) clearInterval(elapsedInterval);
    set({
      status: 'idle',
      result: null,
      jobId: null,
      pollInterval: null,
      elapsedInterval: null,
      elapsedTime: 0,
      repoUrl: '',
      teamName: '',
      teamLeader: '',
      githubToken: '',
      retryLimit: 5,
    });
  },
}));

export default useAgentStore;
