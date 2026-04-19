import { useId } from 'react';

type MarketplaceName = 'Ozon' | 'Wildberries' | string;

function normalizeMarketplace(marketplace: MarketplaceName) {
  if (marketplace.includes('Ozon')) return 'Ozon';
  if (marketplace.includes('Wildberries')) return 'Wildberries';
  return marketplace;
}

export function MarketplaceIcon({
  marketplace,
  className = '',
}: {
  marketplace: MarketplaceName;
  className?: string;
}) {
  const iconId = useId().replace(/:/g, '');
  const kind = normalizeMarketplace(marketplace);

  if (kind === 'Ozon') {
    const clipId = `ozon-clip-${iconId}`;

    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <g clipPath={`url(#${clipId})`}>
          <path d="M0 3C0 1.34315 1.34315 0 3 0H13C14.6569 0 16 1.34315 16 3V13C16 14.6569 14.6569 16 13 16H3C1.34315 16 0 14.6569 0 13V3Z" fill="#005BFF" />
          <path d="M15.9998 8.88971V13C15.9998 14.6569 14.6566 16 12.9998 16H2.99976C2.47679 16 1.98507 15.8662 1.55698 15.6309C0.987686 10.1838 3.48808 5.37268 7.56315 4.50521C10.6824 3.84121 13.9001 5.66329 15.9998 8.88971Z" fill="#F1117E" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.17375 12.7232C5.4174 13.7297 1.81088 12.447 1.11647 9.85537C0.422064 7.26381 2.90401 4.34963 6.66035 3.34312C10.4167 2.33661 14.0232 3.61939 14.7176 6.21096C15.412 8.80252 12.93 11.7167 9.17375 12.7232ZM7.2457 5.5276C4.65244 6.22246 3.06531 8.06112 3.38179 9.24222C3.69827 10.4234 5.9921 11.2221 8.58535 10.5273C11.1785 9.83242 12.7657 7.99372 12.4492 6.81263C12.1327 5.63152 9.84485 4.83116 7.2457 5.5276Z"
            fill="white"
          />
        </g>
        <defs>
          <clipPath id={clipId}>
            <rect width="16" height="16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  }

  if (kind === 'Wildberries') {
    const clipId = `wb-clip-${iconId}`;
    const gradientId = `wb-gradient-${iconId}`;

    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <g clipPath={`url(#${clipId})`}>
          <path d="M0 3C0 1.34315 1.34315 0 3 0H13C14.6569 0 16 1.34315 16 3V13C16 14.6569 14.6569 16 13 16H3C1.34315 16 0 14.6569 0 13V3Z" fill={`url(#${gradientId})`} />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.5721 6.96464C10.9714 6.70464 11.4449 6.54678 11.9742 6.54678C13.3857 6.54678 14.4999 7.62392 14.4999 8.99821C14.4999 10.3725 13.3485 11.4589 11.9649 11.4589C10.5814 11.4589 9.44852 10.3632 9.44852 9.00749V4.54108H10.5721V6.96464ZM10.5721 9.00749C10.5721 9.7782 11.2128 10.3725 11.9742 10.3725C12.7449 10.3725 13.3856 9.75963 13.3856 9.00749C13.3856 8.25535 12.7728 7.65178 11.9742 7.65178C11.1757 7.65178 10.5721 8.23678 10.5721 9.00749ZM5.56713 6.72322L6.59784 9.32321L7.62855 6.72322H8.84497L7.05284 11.3103H6.26355L5.17713 8.58035L4.0907 11.3103H3.30142L1.5 6.72322H2.72571L3.75642 9.32321L4.77785 6.72322H5.56713Z"
            fill="white"
          />
        </g>
        <defs>
          <linearGradient id={gradientId} x1="-0.5" y1="16.5" x2="16" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6F02FA" />
            <stop offset="1" stopColor="#E313BF" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect width="16" height="16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  }

  return (
    <div className={`flex h-4 w-4 items-center justify-center rounded bg-slate-200 text-[8px] font-bold text-slate-600 ${className}`}>
      MP
    </div>
  );
}

export function MarketplaceBadge({
  marketplace,
  className = '',
  compact = false,
}: {
  marketplace: MarketplaceName;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ${compact ? 'px-2 py-0.5' : ''} ${className}`}
    >
      <MarketplaceIcon marketplace={marketplace} />
      <span>{normalizeMarketplace(marketplace)}</span>
    </span>
  );
}
