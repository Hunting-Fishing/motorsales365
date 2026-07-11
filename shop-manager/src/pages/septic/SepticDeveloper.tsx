import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Container } from 'lucide-react';
export default function SepticDeveloper() {
  return <ModuleDeveloperPage moduleSlug="septic" moduleName="Septic Services" moduleIcon={<Container className="h-5 w-5" />} backRoute="/septic" />;
}
