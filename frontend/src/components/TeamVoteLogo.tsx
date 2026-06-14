import { cn } from '../lib/utils';

interface TeamVoteLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export default function TeamVoteLogo({ className, iconClassName, textClassName }: TeamVoteLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="teamvote+">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f0f0]', iconClassName)}>
        <svg viewBox="0 0 160 160" aria-hidden="true" className="h-full w-full">
          <rect x="20" y="20" width="120" height="120" rx="26" fill="#222222" opacity="0.08" />
          <polyline
            points="44,82 66,106 116,52"
            stroke="#222222"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
      <span className={cn('font-heading text-3xl font-bold leading-none text-white', textClassName)}>
        teamvote+
      </span>
    </span>
  );
}
