import { create } from 'zustand'

export const useAgentStore = create((set) => ({
    repoUrl: '',
    teamName: '',
    teamLeader: '',
    jobId: null,
    status: 'IDLE', // IDLE, RUNNING, COMPLETED, FAILED
    result: null,
    logs: [], // If we stream logs

    setRepoUrl: (url) => set({ repoUrl: url }),
    setTeamName: (name) => set({ teamName: name }),
    setTeamLeader: (name) => set({ teamLeader: name }),
    setJobId: (id) => set({ jobId: id }),
    setStatus: (status) => set({ status: status }),
    setResult: (result) => set({ result: result }),
    addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
    reset: () => set({ jobId: null, status: 'IDLE', result: null, logs: [] }),
}))
