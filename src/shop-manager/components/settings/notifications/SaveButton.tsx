
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Save } from "lucide-react";
import { motion } from "framer-motion";

interface SaveButtonProps {
  saveStatus: "idle" | "saved" | "changed";
  onSave: () => void;
}

export function SaveButton({ saveStatus, onSave }: SaveButtonProps) {
  if (saveStatus === "idle") {
    return null;
  }

  return (
    <div className="flex justify-end">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={onSave}
          disabled={saveStatus === "saved"}
          variant={saveStatus === "saved" ? "outline" : "default"}
          className={`transition-all ${saveStatus === "saved" ? "text-green-600 border-green-600" : ""}`}
          size="sm"
        >
          {saveStatus === "saved" ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
