import { useEffect, useState } from 'react';
import { API_BASE, resolveApiUrl } from '../lib/api';
import noImage from '../assets/no-image.png';

interface SafeImageProps {
    src?: string;
    alt: string;
    className?: string;
    load?:(signal:AbortSignal)=>Promise<Blob>;
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

export default function SafeImage({ src, alt, className,load }: SafeImageProps) {
    const placeholder = noImage;
    const [isError, setIsError] = useState(false);
    const [authenticatedImage, setAuthenticatedImage] = useState<{ source: string|((signal:AbortSignal)=>Promise<Blob>); url: string } | null>(null);

    let resolvedSrc = src;
    if (resolvedSrc?.startsWith('/')) {
        resolvedSrc = resolveApiUrl(resolvedSrc);
    }

    const token = localStorage.getItem('token');
    const needsAuth = !!load||!!(resolvedSrc && token && isBackendImage(resolvedSrc));
    const identity=load??resolvedSrc;
    useEffect(() => {
        setIsError(false);
        setAuthenticatedImage(null);
        if (!load&&(!resolvedSrc || !token || !needsAuth)) return;
        const controller = new AbortController();
        let objectUrl: string | undefined;
        (load?load(controller.signal):fetch(resolvedSrc!, {
            headers: { Authorization: 'Bearer ' + token },
            signal: controller.signal,
            redirect: 'error',
            credentials: 'omit'
        }).then(response => {
            if (!response.ok) throw new Error('Image unavailable');
            return response.blob();
        })).then(blob => {
            if (controller.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            setAuthenticatedImage({ source: identity!, url: objectUrl });
        }).catch(() => {
            if (!controller.signal.aborted) setIsError(true);
        });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [resolvedSrc, token, needsAuth,load,identity]);

    const imageSrc = needsAuth
        ? (authenticatedImage && authenticatedImage.source === identity ? authenticatedImage.url : placeholder)
        : resolvedSrc;
    return <img src={isError || !imageSrc ? placeholder : imageSrc} alt={alt}
        className={className} onError={() => setIsError(true)} />;
}
