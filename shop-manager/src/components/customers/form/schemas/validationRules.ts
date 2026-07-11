
import { z } from "zod";

// Refinement rule for other_business_industry field
export const validateOtherBusinessIndustry = (data: any, ctx: z.RefinementCtx) => {
  // If business_industry is 'other', then other_business_industry is required
  if (data.business_industry === 'other' && (!data.other_business_industry || data.other_business_industry.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the industry when 'Other' is selected",
      path: ['other_business_industry']
    });
  }
};
