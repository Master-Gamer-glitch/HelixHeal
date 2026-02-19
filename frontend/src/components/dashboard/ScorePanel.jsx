import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Zap, AlertTriangle, Trophy } from 'lucide-react';

const ScorePanel = ({ score }) => {
    if (!score) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6"
        >
            <Card className="bg-gradient-to-br from-card to-secondary/50 border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        Performance Score
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col items-center">
                            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                                {score.final_score}
                            </span>
                            <span className="text-sm text-muted-foreground uppercase tracking-widest mt-2">Final Score</span>
                        </div>

                        <div className="flex flex-col gap-3 w-full md:w-1/2">
                            {score.speed_bonus != null && (
                                <div className="flex justify-between items-center p-3 rounded-lg bg-background/50 border">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm font-medium">Speed Bonus</span>
                                    </div>
                                    <span className="text-green-600 font-bold">+{score.speed_bonus}</span>
                                </div>
                            )}

                            {score.efficiency_penalty != null && (
                                <div className="flex justify-between items-center p-3 rounded-lg bg-background/50 border">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        <span className="text-sm font-medium">Efficiency Penalty</span>
                                    </div>
                                    <span className="text-red-500 font-bold">{score.efficiency_penalty}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ScorePanel;
