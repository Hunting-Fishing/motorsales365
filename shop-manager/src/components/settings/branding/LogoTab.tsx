
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { LogoUploader } from "./LogoUploader";
import { LogoPreview } from "./LogoPreview";

interface LogoTabProps {
  logoPreview: string | null;
  companyName: string;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompanyNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
}

export function LogoTab({ 
  logoPreview, 
  companyName, 
  onLogoChange, 
  onCompanyNameChange,
  loading = false
}: LogoTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo & Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LogoUploader 
          logoPreview={logoPreview}
          companyName={companyName}
          onLogoChange={onLogoChange}
          onCompanyNameChange={onCompanyNameChange}
          loading={loading}
        />
        <LogoPreview logoPreview={logoPreview} />
      </CardContent>
    </Card>
  );
}
