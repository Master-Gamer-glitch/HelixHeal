import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils'; // Assuming you have a utils file for cn

const ProgressBar = ({ progress, currentStep }) => {
    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="text-primary">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
