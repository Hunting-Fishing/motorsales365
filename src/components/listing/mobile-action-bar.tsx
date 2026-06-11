import { Phone, MessageCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waMeUrl } from "@/lib/whatsapp";

interface Props {
  phone: string | null;
  whatsappMessage?: string;
  onMessageClick: () => void;
  allowMessages?: boolean;
}

export function MobileActionBar({ phone, whatsappMessage, onMessageClick, allowMessages }: Props) {
  const wa = phone ? waMeUrl(phone, whatsappMessage) : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md gap-2">
        {phone && (
          <Button asChild className="flex-1" size="sm">
            <a href={`tel:${phone}`}>
              <Phone className="mr-1.5 h-4 w-4" /> Call
            </a>
          </Button>
        )}
        {wa && (
          <Button asChild className="flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5d]" size="sm">
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
        {allowMessages && (
          <Button variant="outline" className="flex-1" size="sm" onClick={onMessageClick}>
            <MessageSquare className="mr-1.5 h-4 w-4" /> Message
          </Button>
        )}
      </div>
    </div>
  );
}
