'use client';

import React, { useState } from 'react';
import HomePage from '@/app/page';
import { BooksSpace } from '@/components/BooksSpace';
import { BottomTabBar } from '@/components/BottomTabBar';
import { loadSpace, saveSpace, Space } from '@/lib/space/space-mode';

/**
 * Top-level shell (ADR-0003). Owns the News|Books space choice, persists it,
 * and keeps BOTH spaces mounted — the inactive one is hidden with CSS so the
 * News space's state (open article, scroll position, modals) survives
 * switching and returns exactly where it was.
 */
export default function AppShell() {
  const [space, setSpace] = useState<Space>(() => loadSpace());

  const handleSpaceChange = (next: Space) => {
    setSpace(next);
    saveSpace(next);
  };

  return (
    <>
      <div className="space space-news" hidden={space !== 'news'}>
        <HomePage space={space} onSpaceChange={handleSpaceChange} />
      </div>
      <div className="space space-books" hidden={space !== 'books'}>
        <BooksSpace space={space} onSpaceChange={handleSpaceChange} />
      </div>
      <BottomTabBar space={space} onSpaceChange={handleSpaceChange} />
    </>
  );
}
