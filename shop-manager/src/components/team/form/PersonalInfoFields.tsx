
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";
import { TeamMemberFormValues } from "./formValidation";

interface PersonalInfoFieldsProps {
  control: Control<TeamMemberFormValues>;
}

export function PersonalInfoFields({ control }: PersonalInfoFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name</FormLabel>
            <FormControl>
              <Input placeholder="John" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="middleName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Middle Name <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
            <FormControl>
              <Input placeholder="Michael" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name</FormLabel>
            <FormControl>
              <Input placeholder="Smith" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input 
                placeholder="john.smith@wainwrightmarine.com" 
                {...field}
                className="font-mono text-sm"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from first and last name (editable)
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <Input placeholder="555-123-4567" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="Min 6 characters" 
                {...field} 
              />
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1">
              Set a password to create immediate login access
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
