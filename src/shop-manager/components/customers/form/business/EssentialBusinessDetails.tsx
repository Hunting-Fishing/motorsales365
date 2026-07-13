
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ChevronDown, Building2, Truck, CheckCircle } from "lucide-react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerFormValues } from "../schemas/customerSchema";
import { cn } from "@/lib/utils";

interface EssentialBusinessDetailsProps {
  form: UseFormReturn<CustomerFormValues>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  availableShops?: Array<{id: string, name: string}>;
  singleShopMode?: boolean;
}

export const EssentialBusinessDetails: React.FC<EssentialBusinessDetailsProps> = ({ 
  form, 
  isOpen, 
  setIsOpen,
  availableShops = [],
  singleShopMode = false
}) => {
  // Watch form values to determine business status
  const company = form.watch("company");
  const businessType = form.watch("business_type");
  const businessIndustry = form.watch("business_industry");
  const taxId = form.watch("tax_id");
  const businessEmail = form.watch("business_email");
  const businessPhone = form.watch("business_phone");
  const isFleet = form.watch("is_fleet");

  // Check if any business information is present
  const hasBusinessInfo = !!(
    company || 
    businessType || 
    businessIndustry || 
    taxId || 
    businessEmail || 
    businessPhone
  );

  // Auto-expand if business info is present and section is closed
  React.useEffect(() => {
    if (hasBusinessInfo && !isOpen) {
      setIsOpen(true);
    }
  }, [hasBusinessInfo, isOpen, setIsOpen]);

  // Count filled business fields
  const filledFields = [company, businessType, businessIndustry, taxId, businessEmail, businessPhone].filter(Boolean).length;
  const totalFields = 6;

  // Determine section styling based on content
  const getSectionStyle = () => {
    if (isFleet) {
      return "border-blue-200 bg-blue-50";
    }
    if (hasBusinessInfo) {
      return "border-green-200 bg-green-50";
    }
    return "border-gray-200 bg-white";
  };

  const getStatusBadge = () => {
    if (isFleet) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
          <Truck className="w-3 h-3 mr-1" />
          Fleet Customer
        </Badge>
      );
    }
    if (hasBusinessInfo) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
          <Building2 className="w-3 h-3 mr-1" />
          Business Customer
        </Badge>
      );
    }
    return null;
  };

  const getCompletionBadge = () => {
    if (hasBusinessInfo && filledFields > 0) {
      return (
        <Badge variant="outline" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          {filledFields}/{totalFields} completed
        </Badge>
      );
    }
    return null;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-all duration-200",
        getSectionStyle()
      )}>
        <CollapsibleTrigger className="w-full p-4 hover:bg-opacity-80 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">Essential Business Details</h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {getCompletionBadge()}
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter company name" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Type */}
              <FormField
                control={form.control}
                name="business_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="non_profit">Non-Profit</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Industry */}
              <FormField
                control={form.control}
                name="business_industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="agriculture">Agriculture</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="hospitality">Hospitality</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax ID */}
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID / EIN</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter tax ID or EIN" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Email */}
              <FormField
                control={form.control}
                name="business_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="business@company.com" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Phone */}
              <FormField
                control={form.control}
                name="business_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Shop Selection (if not in single shop mode) */}
            {!singleShopMode && availableShops && availableShops.length > 0 && (
              <FormField
                control={form.control}
                name="shop_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shop location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableShops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
