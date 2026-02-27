import { useState } from 'react';

interface SafeImageProps {
    src?: string;
    alt: string;
    className?: string;
}

export default function SafeImage({ src, alt, className }: SafeImageProps) {
    const placeholder = 'https://placehold.co/600x400/f8f9fa/3e5569?text=Bez+fotografie';

    const [isError, setIsError] = useState(false);

    return (
        <img
            src={isError || !src ? placeholder : src}
            alt={alt}
            className={className}
            onError={() => {
                if (!isError) setIsError(true);
            }}
        />
    );
}