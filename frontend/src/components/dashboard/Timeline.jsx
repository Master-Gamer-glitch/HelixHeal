import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

const Timeline = ({ timeline }) => {
    if (!timeline || timeline.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle>CI/CD Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative border-l border-muted ml-3 space-y-8 pb-4">
                        {timeline.map((point, index) => (
                            <div key={index} className="relative pl-8">
                                <span
                                    className={cn(
                                        "absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background",
                                        point.status === "PASSED" ? "bg-green-500" : "bg-red-500"
                                    )}
                                />
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold">Iteration {point.iteration}</h4>
                                        <span className={cn(
                                            "text-xs font-medium px-2 py-0.5 rounded-full",
                                            point.status === "PASSED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        )}>
                                            {point.status}
                                        </span>
                                    </div>
                                    <time className="mb-1 text-xs font-normal text-muted-foreground flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(point.timestamp).toLocaleTimeString()}
                                    </time>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default Timeline;
