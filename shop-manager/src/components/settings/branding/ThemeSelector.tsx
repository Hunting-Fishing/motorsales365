
import { Label } from "@/components/ui/label";

interface ThemeSelectorProps {
  theme: string;
  setTheme: (value: any) => void;
}

export function ThemeSelector({ theme, setTheme }: ThemeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Choose Theme</Label>
      <div className="flex flex-col space-y-2">
        <div 
          className={`border rounded-md p-4 hover:border-primary cursor-pointer ${
            theme === 'light' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setTheme('light')}
        >
          <div className="font-medium">Light Mode</div>
          <div className="text-sm text-muted-foreground">
            Clean and bright interface
          </div>
        </div>
        
        <div 
          className={`border rounded-md p-4 hover:border-primary cursor-pointer ${
            theme === 'dark' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setTheme('dark')}
        >
          <div className="font-medium">Dark Mode</div>
          <div className="text-sm text-muted-foreground">
            Reduced eye strain in low-light environments
          </div>
        </div>
        
        <div 
          className={`border rounded-md p-4 hover:border-primary cursor-pointer ${
            theme === 'auto' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setTheme('auto')}
        >
          <div className="font-medium">Auto (System)</div>
          <div className="text-sm text-muted-foreground">
            Follows your system's theme setting
          </div>
        </div>
      </div>
    </div>
  );
}
