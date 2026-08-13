'use client';

import { easeOut, motion } from 'motion/react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FlipCardData {
  name: string;
  username: string;
  image: string;
  bio: string;
  stats: {
    following: number;
    followers: number;
    posts?: number;
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
}

interface FlipCardBaseProps {
  className?: string;
}

interface FlipCardSlotsProps extends FlipCardBaseProps {
  front: React.ReactNode;
  back: React.ReactNode;
  data?: never;
}

interface FlipCardDataProps extends FlipCardBaseProps {
  data: FlipCardData;
  front?: never;
  back?: never;
}

export type FlipCardProps = FlipCardSlotsProps | FlipCardDataProps;

function usePreferTouchFlip() {
  const [preferTouchFlip, setPreferTouchFlip] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const sync = () => setPreferTouchFlip(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return preferTouchFlip;
}

function DefaultProfileFront({ data }: { data: FlipCardData }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-md border-2 border-foreground/20 bg-gradient-to-br from-muted via-background to-muted px-4 py-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.image}
        alt={data.name}
        className="mb-4 size-20 rounded-full border-2 object-cover md:size-24"
      />
      <h2 className="text-lg font-bold text-foreground">{data.name}</h2>
      <p className="text-sm text-muted-foreground">@{data.username}</p>
    </div>
  );
}

function DefaultProfileBack({ data }: { data: FlipCardData }) {
  return (
    <div className="flex h-full flex-col items-center justify-between gap-y-4 rounded-md border-2 border-foreground/20 bg-gradient-to-tr from-muted via-background to-muted px-4 py-6">
      <p className="text-center text-xs text-muted-foreground md:text-sm">{data.bio}</p>
      <div className="flex w-full items-center justify-between px-6">
        <div>
          <p className="text-base font-bold">{data.stats.following}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div>
          <p className="text-base font-bold">{data.stats.followers}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        {data.stats.posts != null && (
          <div>
            <p className="text-base font-bold">{data.stats.posts}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        )}
      </div>
    </div>
  );
}

const faceBaseClassName = 'absolute inset-0 h-full w-full';

export function FlipCard(props: FlipCardProps) {
  const { className } = props;
  const [isFlipped, setIsFlipped] = React.useState(false);
  const preferTouchFlip = usePreferTouchFlip();

  const front =
    'front' in props && props.front != null
      ? props.front
      : props.data
        ? <DefaultProfileFront data={props.data} />
        : null;

  const back =
    'back' in props && props.back != null
      ? props.back
      : props.data
        ? <DefaultProfileBack data={props.data} />
        : null;

  const handleClick = () => {
    if (preferTouchFlip) setIsFlipped((prev) => !prev);
  };

  const handleMouseEnter = () => {
    if (!preferTouchFlip) setIsFlipped(true);
  };

  const handleMouseLeave = () => {
    if (!preferTouchFlip) setIsFlipped(false);
  };

  return (
    <div
      className={cn(
        'relative mx-auto h-full min-h-[28rem] w-full cursor-pointer',
        className,
      )}
      style={{ perspective: 1200 }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsFlipped((prev) => !prev);
        }
      }}
    >
      {/* Single rotator — only one transform animates, so faces never cross-fade */}
      <motion.div
        className="relative h-full w-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: easeOut }}
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      >
        <div
          className={faceBaseClassName}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          {front}
        </div>
        <div
          className={faceBaseClassName}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
