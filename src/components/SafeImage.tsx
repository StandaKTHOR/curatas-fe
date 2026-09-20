import { useState } from 'react';
import { API_BASE } from '../lib/api';

interface SafeImageProps {
    src?: string;
    alt: string;
    className?: string;
}

export default function SafeImage({ src, alt, className }: SafeImageProps) {
    const placeholder = 'https://placehold.co/600x400/f8f9fa/3e5569?text=Bez+fotografie';

    const [isError, setIsError] = useState(false);

    let resolvedSrc = src;
    if (resolvedSrc && !isError) {
        if (resolvedSrc.startsWith('/')) {
            const baseUrl = API_BASE ? API_BASE.replace(/\/+$/, '') : '';
            resolvedSrc = `${baseUrl}${resolvedSrc}`;
        } else if (API_BASE && (resolvedSrc.startsWith('http://localhost:8080') || resolvedSrc.startsWith('http://127.0.0.1:8080'))) {
            const baseUrl = API_BASE.replace(/\/+$/, '');
            resolvedSrc = resolvedSrc.replace(/^http:\/\/(localhost|127\.0\.0\.1):8080/, baseUrl);
        }
    }

    return (
        <img
            src={isError || !resolvedSrc ? placeholder : resolvedSrc}
            alt={alt}
            className={className}
            onError={() => {
                if (!isError) setIsError(true);
            }}
        />
    );
}
