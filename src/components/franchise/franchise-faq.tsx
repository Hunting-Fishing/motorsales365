import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "What's the difference between Partner and Franchise?",
    a: "Partner keeps your existing brand and gets a Verified Partner badge with core benefits. Franchise operates under the 365 brand with co-branded signage, deeper discounts, territory support, and lead routing from the 365 marketplace — similar to how NAPA AutoCare works with independent shops.",
  },
  {
    q: "Do I have to close my current shop or change my name to join?",
    a: "No. Partner tier is designed for independent shops that keep their name and branding. Only the full Franchise tier involves co-branding under 365.",
  },
  {
    q: "How does the network stock visibility work?",
    a: "Once approved, your inventory in 365 Shop Manager becomes visible to other partner shops (only stock levels and location — never your cost or supplier). You can source urgently needed parts from a nearby partner instead of losing the job.",
  },
  {
    q: "What is the shared customer CRM?",
    a: "With customer consent, a unified profile follows the vehicle and owner across partner shops — service history, previous quotes, notes. Customers get better service; you get warm context on first visit. Details are explained in our Privacy Policy.",
  },
  {
    q: "Are there fees?",
    a: "Current tier fees are shown in the comparison table above. We charge no revenue share on parts sales or repair invoices — the network is funded by membership and marketplace advertising.",
  },
  {
    q: "How long does approval take?",
    a: "Most applications are reviewed within 5 business days. We may ask for business registration and shop photos before approving.",
  },
  {
    q: "Can I cancel?",
    a: "Yes — memberships are month-to-month for Partner, with a minimum term for Franchise (disclosed in the agreement before you sign).",
  },
];

export function FranchiseFaq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQ.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
