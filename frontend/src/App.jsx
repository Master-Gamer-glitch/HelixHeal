import React, { useEffect } from 'react';
import InputSection from './components/InputSection';
import RunSummary from './components/dashboard/RunSummary';
import ScorePanel from './components/dashboard/ScorePanel';
import FixesTable from './components/dashboard/FixesTable';
import Timeline from './components/dashboard/Timeline';
import { useAgentStore } from './store/useAgentStore';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const {
    jobId,
    status,
    setStatus,
    result,
    setResult,
    repoUrl,
    teamName,
    teamLeader
  } = useAgentStore();

  useEffect(() => {
    let interval;
    if (jobId && (status === 'RUNNING' || status === 'PENDING')) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:8000/results/${jobId}`);
          const data = await response.json();

          if (data) {
            setResult(data);
            if (data.status === 'COMPLETED' || data.status === 'FAILED') {
              setStatus(data.status);
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, status, setStatus, setResult]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>

      <main className="container mx-auto px-4 py-12 md:py-24 max-w-7xl">
        <header className="mb-12 text-center">
          {/* Header content if needed, but InputSection acts as hero */}
        </header>

        <InputSection />

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RunSummary
                summary={result.summary}
                repoUrl={result.repository}
                teamName={result.team?.name}
                teamLeader={result.team?.leader}
                branchName={result.branch_created}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FixesTable fixes={result.fixes} />
                </div>
                <div>
                  <ScorePanel score={result.score} />
                  <Timeline timeline={result.ci_timeline} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
