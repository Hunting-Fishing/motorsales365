
import { InventoryItemExtended } from "@sm/types/inventory";

export interface InventoryFormProps {
  item?: InventoryItemExtended;
  onSubmit: (formData: Partial<InventoryItemExtended>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}
