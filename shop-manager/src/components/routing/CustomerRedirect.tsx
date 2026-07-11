
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export const CustomerRedirect = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id || id === "undefined") {
      console.error("Invalid customer ID in URL, redirecting to customers list");
      toast({
        title: "Navigation Error",
        description: "Invalid customer ID. Redirecting to customers list.",
        variant: "destructive",
      });
      navigate("/customers", { replace: true });
    }
  }, [id, navigate]);

  return null;
};
