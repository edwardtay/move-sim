import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Loader2, AlertCircle, FileCode } from 'lucide-react';
import pako from 'pako';

interface SourceViewerProps {
    address: string;
    moduleName: string;
}

export function SourceViewer({ address, moduleName }: SourceViewerProps) {
    const [source, setSource] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSource = async () => {
            if (!address || !moduleName) return;

            setIsLoading(true);
            setError(null);
            setSource(null);

            try {
                const API_URL = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${API_URL}/api/source/${address}/${moduleName}`);
                const data = await response.json();

                if (data.success && data.data.source) {
                    // Decompress the source (hex string -> uint8array -> string)
                    const hex = data.data.source.startsWith('0x') ? data.data.source.slice(2) : data.data.source;
                    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
                    const decompressed = pako.ungzip(bytes, { to: 'string' });
                    setSource(decompressed);
                } else {
                    setError("Source code not found for this module");
                }
            } catch (err) {
                console.error("Failed to fetch source", err);
                setError("Failed to load source code");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSource();
    }, [address, moduleName]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Fetching source code...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
            </div>
        );
    }

    if (!source) return null;

    return (
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {address}::{moduleName}.move
                </span>
            </div>
            <SyntaxHighlighter
                language="rust" // Move syntax is close to Rust
                style={vscDarkPlus}
                customStyle={{ margin: 0, borderRadius: 0 }}
                showLineNumbers={true}
            >
                {source}
            </SyntaxHighlighter>
        </div>
    );
}
