
// Parse tagged items from message content
export const parseTaggedItems = (content: string): { 
  workOrderIds: string[], 
  partIds: string[], 
  warrantyIds: string[],
  jobIds: string[] 
} => {
  const workOrderPattern = /#WO-([a-zA-Z0-9-]+)/g;
  const partPattern = /#PART-([a-zA-Z0-9-]+)/g;
  const warrantyPattern = /#WARRANTY-([a-zA-Z0-9-]+)/g;
  const jobPattern = /#JOB-([a-zA-Z0-9-]+)/g;
  
  const workOrderMatches = [...content.matchAll(workOrderPattern)];
  const partMatches = [...content.matchAll(partPattern)];
  const warrantyMatches = [...content.matchAll(warrantyPattern)];
  const jobMatches = [...content.matchAll(jobPattern)];
  
  return {
    workOrderIds: workOrderMatches.map(match => match[1]),
    partIds: partMatches.map(match => match[1]),
    warrantyIds: warrantyMatches.map(match => match[1]),
    jobIds: jobMatches.map(match => match[1])
  };
};
