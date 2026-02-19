import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Clock, CheckCircle, XCircle, GitBranch, ShieldAlert, Wrench } from 'lucide-react';

const RunSummary = ({ summary, repoUrl, teamName, teamLeader, branchName }) => {
    if (!summary) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Repository Info</CardTitle>
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold truncate">{teamName}</div>
                    <p className="text-xs text-muted-foreground truncate">{repoUrl}</p>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                        <span className="font-mono bg-muted px-1 py-0.5 rounded">{branchName}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failures vs Fixes</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold text-red-500">{summary.total_failures}</span>
                            <span className="text-xs text-muted-foreground">Failures</span>
                        </div>
                        <div className="h-8 w-px bg-border mx-2"></div>
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-bold text-green-500">{summary.total_fixes}</span>
                            <span className="text-xs text-muted-foreground">Fixed</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">CI Status</CardTitle>
                    {summary.ci_status === "PASSED" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <Badge variant={summary.ci_status === "PASSED" ? "success" : "destructive"} className="text-lg px-3 py-1">
                            {summary.ci_status}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        After {summary.iterations_used} iterations
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Time Taken</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.time_taken_seconds}s</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {summary.time_taken_seconds < 300 ? "Speed Bonus Active" : "Standard Time"}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default RunSummary;
