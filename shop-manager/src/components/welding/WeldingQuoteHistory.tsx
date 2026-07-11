import WeldingChangeHistory from "./WeldingChangeHistory";

const quoteChangeTypeLabels: Record<string, string> = {
  status_change: "Status Changed",
  amount_change: "Estimate Updated",
  converted_to_invoice: "Converted to Invoice",
  update: "Updated",
};

const quoteFieldLabels: Record<string, string> = {
  status: "Status",
  estimated_amount: "Estimated Amount",
  labour_hours: "Labour Hours",
  travel_cost: "Travel Cost",
  converted_to_invoice: "Invoice",
};

interface Props {
  history: any[];
  showHistory: boolean;
  onToggle: () => void;
}

const WeldingQuoteHistory = (props: Props) => (
  <WeldingChangeHistory {...props} changeTypeLabels={quoteChangeTypeLabels} fieldLabels={quoteFieldLabels} />
);

export default WeldingQuoteHistory;
