import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ModuleScreenshot } from '@/config/landingModules';

interface ScreenshotGalleryProps {
  screenshots: ModuleScreenshot[];
  moduleName: string;
}

export function ScreenshotGallery({ screenshots, moduleName }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'ArrowRight') setSelectedIndex((i) => Math.min((i ?? 0) + 1, screenshots.length - 1));
    if (e.key === 'ArrowLeft') setSelectedIndex((i) => Math.max((i ?? 0) - 1, 0));
    if (e.key === 'Escape') setSelectedIndex(null);
  }, [selectedIndex, screenshots.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground mb-3">See It In Action</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real screenshots from the {moduleName} dashboard. Click any image to view full size.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {screenshots.map((screenshot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => setSelectedIndex(index)}
            >
              <div className="relative rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-background">
                <img
                  src={screenshot.src}
                  alt={screenshot.alt}
                  loading="lazy"
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">{screenshot.alt}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
          {selectedIndex !== null && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={screenshots[selectedIndex].src}
                alt={screenshots[selectedIndex].alt}
                className="max-w-full max-h-[85vh] object-contain"
              />

              {/* Navigation */}
              {screenshots.length > 1 && (
                <>
                  {selectedIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10"
                      onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  )}
                  {selectedIndex < screenshots.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10"
                      onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  )}
                </>
              )}

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {selectedIndex + 1} / {screenshots.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
