import { useEffect, useState } from 'react';
import { API_BASE, resolveApiUrl } from '../lib/api';

interface SafeImageProps {
    src?: string;
    alt: string;
    className?: string;
}

export function isBackendImage(url: string): boolean {
    try {
        const base = new URL(API_BASE || '/', window.location.href);
        const target = new URL(url, window.location.href);
        const prefix = base.pathname.replace(/\/+$/, '');
        return target.origin === base.origin && !target.username && !target.password &&
            (target.pathname.startsWith(prefix + '/api/v1/media/items/') ||
             target.pathname.startsWith(prefix + '/media/items/'));
    } catch { return false; }
}

export default function SafeImage({ src, alt, className }: SafeImageProps) {
    const placeholder = 'https://placehold.co/600x400/f8f9fa/3e5569?text=Bez+fotografie';
    const [isError, setIsError] = useState(false);
    const [authenticatedImage, setAuthenticatedImage] = useState<{ source: string; url: string } | null>(null);

    let resolvedSrc = src;
    if (resolvedSrc?.startsWith('/')) {
        resolvedSrc = resolveApiUrl(resolvedSrc);
    } else if (API_BASE && resolvedSrc && /^http:\/\/(localhost|127\.0\.0\.1):8080/.test(resolvedSrc)) {
        resolvedSrc = resolvedSrc.replace(/^http:\/\/(localhost|127\.0\.0\.1):8080/, API_BASE);
    }

    const token = localStorage.getItem('token');
    const needsAuth = !!(resolvedSrc && token && isBackendImage(resolvedSrc));
    useEffect(() => {
        setIsError(false);
        setAuthenticatedImage(null);
        if (!resolvedSrc || !token || !needsAuth) return;
        const controller = new AbortController();
        let objectUrl: string | undefined;
        fetch(resolvedSrc, {
            headers: { Authorization: 'Bearer ' + token },
            signal: controller.signal,
            redirect: 'error',
            credentials: 'omit'
        }).then(response => {
            if (!response.ok) throw new Error('Image unavailable');
            return response.blob();
        }).then(blob => {
            if (controller.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            setAuthenticatedImage({ source: resolvedSrc!, url: objectUrl });
        }).catch(() => {
            if (!controller.signal.aborted) setIsError(true);
        });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [resolvedSrc, token, needsAuth]);

    const imageSrc = needsAuth
        ? (authenticatedImage && authenticatedImage.source === resolvedSrc ? authenticatedImage.url : placeholder)
        : resolvedSrc;
    return <img src={isError || !imageSrc ? placeholder : imageSrc} alt={alt}
        className={className} onError={() => setIsError(true)} />;
}