import React from "react";
import { Helmet } from "react-helmet-async";
import { InsuranceDashboard } from "@/components/insurance/InsuranceDashboard";

const Insurance = () => {
  return (
    <>
      <Helmet>
        <title>Insurance Management | Fleet & Equipment Insurance Tracking</title>
        <meta 
          name="description" 
          content="Manage insurance policies for your fleet and equipment. Track renewals, premiums, coverage, and insurance budgets in one place." 
        />
      </Helmet>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <InsuranceDashboard />
      </div>
    </>
  );
};

export default Insurance;
