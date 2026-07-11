export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatus = "unpaid" | "paid" | "partially_paid" | "refunded" | "failed";

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address_id?: string;
  billing_address_id?: string;
  payment_intent_id?: string;
  payment_status: PaymentStatus;
  shipping_method?: string;
  shipping_cost?: number;
  tax_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    image_url?: string;
    sku?: string;
  };
}

export interface CreateOrderRequest {
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  shipping_address_id?: string;
  billing_address_id?: string;
  payment_intent_id?: string;
  shipping_method?: string;
  notes?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  shipping_method?: string;
  notes?: string;
}

export const orderStatusOptions = [
  { label: 'Pending', value: 'pending' as OrderStatus },
  { label: 'Processing', value: 'processing' as OrderStatus },
  { label: 'Shipped', value: 'shipped' as OrderStatus },
  { label: 'Delivered', value: 'delivered' as OrderStatus },
  { label: 'Cancelled', value: 'cancelled' as OrderStatus },
  { label: 'Refunded', value: 'refunded' as OrderStatus },
];

export const paymentStatusOptions = [
  { label: 'Unpaid', value: 'unpaid' as PaymentStatus },
  { label: 'Paid', value: 'paid' as PaymentStatus },
  { label: 'Partially Paid', value: 'partially_paid' as PaymentStatus },
  { label: 'Refunded', value: 'refunded' as PaymentStatus },
  { label: 'Failed', value: 'failed' as PaymentStatus },
];