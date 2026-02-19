import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Check, X } from 'lucide-react';

const FixesTable = ({ fixes }) => {
    if (!fixes || fixes.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Fixes Applied</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3">File</th>
                                    <th className="px-6 py-3">Bug Type</th>
                                    <th className="px-6 py-3">Line</th>
                                    <th className="px-6 py-3">Commit Message</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fixes.map((fix, index) => (
                                    <motion.tr
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * index }}
                                        className="bg-background border-b hover:bg-muted/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium">{fix.file}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline">{fix.bug_type}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{fix.line || "-"}</td>
                                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={fix.commit_message}>
                                            {fix.commit_message}
                                        </td>
                                        <td className="px-6 py-4">
                                            {fix.status === "Fixed" ? (
                                                <Badge variant="success" className="flex w-fit items-center gap-1">
                                                    <Check className="h-3 w-3" /> Fixed
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                    <X className="h-3 w-3" /> Failed
                                                </Badge>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default FixesTable;
