
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playNotificationSound } from "@/utils/notificationSounds";

interface NotificationSoundCardProps {
  selectedSound: string;
  onSoundChange: (sound: string) => void;
}

export function NotificationSoundCard({ selectedSound, onSoundChange }: NotificationSoundCardProps) {
  const sounds = [
    { id: "default", label: "Default" },
    { id: "bell", label: "Bell" },
    { id: "chime", label: "Chime" },
    { id: "alert", label: "Alert" },
    { id: "none", label: "None (Silent)" },
  ];

  const handlePlaySound = (sound: string) => {
    if (sound !== "none") {
      playNotificationSound(sound);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Notification Sound</CardTitle>
        </div>
        <Bell className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-4">
        <RadioGroup
          value={selectedSound}
          onValueChange={onSoundChange}
          className="space-y-3"
        >
          {sounds.map((sound) => (
            <div key={sound.id} className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={sound.id} id={`sound-${sound.id}`} />
                <Label htmlFor={`sound-${sound.id}`} className="cursor-pointer">
                  {sound.label}
                </Label>
              </div>
              {sound.id !== "none" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handlePlaySound(sound.id)}
                >
                  Test
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
