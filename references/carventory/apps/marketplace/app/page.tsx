'use client';

import { motion } from 'framer-motion';
import HeroSection from '@/components/HeroSection';
import SearchFilters from '@/components/SearchFilters';
import TrustSection from '@/components/TrustSection';
import { Suspense } from 'react';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen"
    >
      <HeroSection />
      <Suspense fallback={<div className="h-96 skeleton" />}>
        <SearchFilters />
      </Suspense>
      <TrustSection />
    </motion.div>
  );
}