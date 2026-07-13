
interface ThemePreviewProps {
  theme: string;
}

import { Button } from "@/components/ui/button";

export function ThemePreview({ theme }: ThemePreviewProps) {
  return (
    <div className="space-y-2">
      <div className={`border rounded-md overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'
      }`}>
        <div className={`p-3 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          Header
        </div>
        <div className="p-4">
          <div className="font-medium mb-2">Content Section</div>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            This is how your content will appear in the selected theme.
          </p>
          <div className="mt-3">
            <Button size="sm" className={
              theme === 'dark' ? 'bg-blue-600' : 'bg-esm-blue-600'
            }>
              Action Button
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
