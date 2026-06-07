import type { OfferFieldPath } from "@/lib/schemas/offer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const FIELD_LABELS: Record<OfferFieldPath, string> = {
  companyName: "Company name",
  jobTitle: "Job title",
  "location.city": "City",
  "location.state": "State",
  "cashCompensation.baseSalary": "Base salary",
  "equityCompensation.equityType": "Equity type",
  "equityCompensation.totalGrantValue": "Equity grant value or shares",
  "equityCompensation.vestingScheduleYears": "Vesting schedule length",
  "equityCompensation.cliffMonths": "Equity cliff",
  "equityCompensation.vestingFrequency": "Vesting frequency",
};

export function MissingFieldsSummary({ fields }: { fields: OfferFieldPath[] }) {
  if (fields.length === 0) return null;

  return (
    <Alert className="border-[#00c805]/30 bg-[#00c805]/5">
      <AlertTitle>Review missing details</AlertTitle>
      <AlertDescription>
        Fill in {fields.length === 1 ? "this field" : "these fields"} before saving:{" "}
        {fields.map((field) => FIELD_LABELS[field]).join(", ")}.
      </AlertDescription>
    </Alert>
  );
}
