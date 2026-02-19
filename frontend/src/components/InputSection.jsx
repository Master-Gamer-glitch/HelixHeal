import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import { useAgentStore } from '../store/useAgentStore';
import { Loader2, Rocket, AlertCircle } from 'lucide-react';

const InputSection = () => {
    const {
        repoUrl, setRepoUrl,
        teamName, setTeamName,
        teamLeader, setTeamLeader,
        status, setStatus, setJobId,
        result
    } = useAgentStore();

    const [isLoading, setIsLoading] = useState(false);
    const [githubToken, setGithubToken] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!repoUrl || !teamName || !teamLeader) return;

        setIsLoading(true);
        setStatus('RUNNING');

        try {
            const response = await fetch('http://localhost:8000/run-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    team_name: teamName,
                    team_leader: teamLeader,
                    github_token: githubToken || null
                }),
            });

            const data = await response.json();
            setJobId(data.job_id);
        } catch (error) {
            console.error('Failed to start agent:', error);
            setStatus('FAILED');
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-2xl mx-auto mb-12 perspective-1000"
        >
            <Card className="bg-gradient-to-br from-card to-background border-primary/20 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 text-primary">
                        <Rocket className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        Autonomous Code Fixer
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Deploy the AI agent to analyze, test, and fix your repository automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                GitHub Repository URL
                            </label>
                            <Input
                                placeholder="https://github.com/user/repo"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                required
                                disabled={status === 'RUNNING'}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Team Name</label>
                                <Input
                                    placeholder="e.g. Rift Organisers"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    required
                                    disabled={status === 'RUNNING'}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Team Leader</label>
                                <Input
                                    placeholder="e.g. Saiyam Kumar"
                                    value={teamLeader}
                                    onChange={(e) => setTeamLeader(e.target.value)}
                                    required
                                    disabled={status === 'RUNNING'}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                GitHub Token (Optional - Required for Push)
                            </label>
                            <Input
                                type="password"
                                placeholder="ghp_..."
                                value={githubToken}
                                onChange={(e) => setGithubToken(e.target.value)}
                                disabled={status === 'RUNNING'}
                            />
                            <p className="text-xs text-muted-foreground">
                                Token must have 'repo' scope. If omitted, fixes will only be committed locally.
                            </p>
                        </div>

                        {status === 'FAILED' && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold">Execution Failed</p>
                                    <p className="text-sm opacity-90">{result?.current_step || "An unknown error occurred. Check backend logs."}</p>
                                </div>
                            </div>
                        )}

                        {status === 'RUNNING' ? (
                            <ProgressBar
                                progress={result?.progress || 0}
                                currentStep={result?.current_step || "Initializing..."}
                            />
                        ) : (
                            <Button
                                type="submit"
                                className="w-full text-lg h-12"
                                variant="premium"
                                disabled={isLoading || status === 'RUNNING'}
                            >
                                {isLoading || status === 'RUNNING' ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Starting Agent...
                                    </>
                                ) : (
                                    "Run Agent"
                                )}
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Decorative background blur */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full opacity-50" />
        </motion.div>
    );
};

export default InputSection;
