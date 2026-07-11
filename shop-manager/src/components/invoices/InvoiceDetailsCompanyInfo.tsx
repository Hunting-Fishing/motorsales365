
interface InvoiceDetailsCompanyInfoProps {
  companyName: string;
  companyDescription: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

export function InvoiceDetailsCompanyInfo({
  companyName,
  companyDescription,
  companyAddress,
  companyPhone,
  companyEmail,
}: InvoiceDetailsCompanyInfoProps) {
  return (
    <div className="text-right">
      <div className="font-bold text-xl text-esm-blue-600">{companyName}</div>
      <div className="text-slate-500">{companyDescription}</div>
      <div className="mt-2 text-sm text-slate-500">
        <p>{companyAddress}</p>
        <p>Phone: {companyPhone}</p>
        <p>Email: {companyEmail}</p>
      </div>
    </div>
  );
}
