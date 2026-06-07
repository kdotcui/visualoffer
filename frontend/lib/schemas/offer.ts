import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().nonnegative().optional(),
);

const requiredNumber = (message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z.coerce.number({ message }).positive(message),
  );

const isoDate = optionalText.refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Use YYYY-MM-DD format.",
);

export const WorkModeSchema = z.enum(["onsite", "hybrid", "remote", "unknown"]);
export const EmploymentTypeSchema = z.enum(["full_time", "part_time", "internship"]);
export const EquityTypeSchema = z.enum(["rsu", "stock_options", "other"]);
export const VestingFrequencySchema = z.enum(["monthly", "quarterly", "semi_annually", "annually"]);
export const OfferSourceSchema = z.enum(["manual", "ai"]);

export const LocationSchema = z.object({
  city: requiredText("City is required."),
  state: requiredText("State is required."),
  country: z.literal("US").default("US"),
  workMode: WorkModeSchema.default("unknown"),
});

export const EmploymentSchema = z.object({
  type: EmploymentTypeSchema.default("full_time"),
  offerDate: isoDate,
  startDate: isoDate,
});

export const CashCompensationSchema = z.object({
  currency: z.literal("USD").default("USD"),
  baseSalary: requiredNumber("Base salary is required."),
  targetAnnualBonusPercentage: optionalNumber,
  signOnBonus: optionalNumber,
  additionalBonus: optionalNumber,
  signOnPayoutTerms: optionalText,
});

export const EquityCompensationBaseSchema = z.object({
  equityType: EquityTypeSchema.optional(),
  totalGrantValue: optionalNumber,
  totalShares: optionalNumber,
  vestingScheduleYears: optionalNumber,
  cliffMonths: optionalNumber,
  vestingFrequency: VestingFrequencySchema.optional(),
  vestingStartDate: isoDate,
  notes: optionalText,
});

export const EquityCompensationSchema = EquityCompensationBaseSchema.superRefine((value, ctx) => {
    const hasEquityDetails = Object.values(value).some((field) => field !== undefined);
    if (!hasEquityDetails) return;

    if (!value.equityType) {
      ctx.addIssue({
        code: "custom",
        path: ["equityType"],
        message: "Equity type is required when equity details are provided.",
      });
    }

    if (value.totalGrantValue === undefined && value.totalShares === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["totalGrantValue"],
        message: "Enter either grant value or share count.",
      });
    }
});

export const BenefitsSchema = z.object({
  match401k: optionalText,
  healthInsurance: optionalText,
  relocation: optionalText,
  paidTimeOff: optionalText,
  notes: optionalText,
});

export const OfferDataSchema = z.object({
  companyName: requiredText("Company name is required."),
  jobTitle: requiredText("Job title is required."),
  level: optionalText,
  location: LocationSchema,
  employment: EmploymentSchema,
  cashCompensation: CashCompensationSchema,
  equityCompensation: EquityCompensationSchema.optional(),
  benefits: BenefitsSchema.optional(),
  notes: optionalText,
});

export const OfferFieldPathSchema = z.enum([
  "companyName",
  "jobTitle",
  "location.city",
  "location.state",
  "cashCompensation.baseSalary",
  "equityCompensation.equityType",
  "equityCompensation.totalGrantValue",
  "equityCompensation.vestingScheduleYears",
  "equityCompensation.cliffMonths",
  "equityCompensation.vestingFrequency",
]);

export const StoredOfferSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  source: OfferSourceSchema,
  parser: z
    .object({
      model: z.string().min(1),
      warnings: z.array(z.string()),
      missingFields: z.array(OfferFieldPathSchema),
    })
    .optional(),
  offer: OfferDataSchema,
});

const PartialLocationSchema = LocationSchema.partial().extend({
  country: z.literal("US").optional(),
  workMode: WorkModeSchema.optional(),
});

const PartialEmploymentSchema = EmploymentSchema.partial().extend({
  type: EmploymentTypeSchema.optional(),
});

const PartialCashCompensationSchema = CashCompensationSchema.partial().extend({
  currency: z.literal("USD").optional(),
});

export const PartialOfferDataSchema = z.object({
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  level: z.string().optional(),
  location: PartialLocationSchema.optional(),
  employment: PartialEmploymentSchema.optional(),
  cashCompensation: PartialCashCompensationSchema.optional(),
  equityCompensation: EquityCompensationBaseSchema.optional(),
  benefits: BenefitsSchema.partial().optional(),
  notes: z.string().optional(),
});

export type OfferData = z.infer<typeof OfferDataSchema>;
export type OfferDataInput = z.input<typeof OfferDataSchema>;
export type PartialOfferData = z.infer<typeof PartialOfferDataSchema>;
export type StoredOffer = z.infer<typeof StoredOfferSchema>;
export type OfferFieldPath = z.infer<typeof OfferFieldPathSchema>;
export type OfferSource = z.infer<typeof OfferSourceSchema>;

export const DEFAULT_OFFER_VALUES: OfferData = {
  companyName: "",
  jobTitle: "",
  location: {
    city: "",
    state: "",
    country: "US",
    workMode: "unknown",
  },
  employment: {
    type: "full_time",
  },
  cashCompensation: {
    currency: "USD",
    baseSalary: 0,
  },
};

export function mergeOfferDefaults(data?: PartialOfferData): OfferData {
  return {
    ...DEFAULT_OFFER_VALUES,
    ...data,
    location: {
      ...DEFAULT_OFFER_VALUES.location,
      ...data?.location,
    },
    employment: {
      ...DEFAULT_OFFER_VALUES.employment,
      ...data?.employment,
    },
    cashCompensation: {
      ...DEFAULT_OFFER_VALUES.cashCompensation,
      ...data?.cashCompensation,
      currency: "USD",
    },
    equityCompensation: data?.equityCompensation,
    benefits: data?.benefits,
  };
}

export function getMissingFields(data: PartialOfferData): OfferFieldPath[] {
  const isMissingNumber = (value: unknown) => {
    const numeric = Number(value);
    return value === undefined || value === null || value === "" || !Number.isFinite(numeric) || numeric <= 0;
  };
  const missing: OfferFieldPath[] = [];
  if (!data.companyName?.trim()) missing.push("companyName");
  if (!data.jobTitle?.trim()) missing.push("jobTitle");
  if (!data.location?.city?.trim()) missing.push("location.city");
  if (!data.location?.state?.trim()) missing.push("location.state");
  if (isMissingNumber(data.cashCompensation?.baseSalary)) missing.push("cashCompensation.baseSalary");

  const equity = data.equityCompensation;
  if (equity && Object.values(equity).some((field) => field !== undefined && field !== "")) {
    if (!equity.equityType) missing.push("equityCompensation.equityType");
    if (isMissingNumber(equity.totalGrantValue) && isMissingNumber(equity.totalShares)) {
      missing.push("equityCompensation.totalGrantValue");
    }
    if (!isMissingNumber(equity.totalGrantValue)) {
      if (isMissingNumber(equity.vestingScheduleYears)) missing.push("equityCompensation.vestingScheduleYears");
      if (isMissingNumber(equity.cliffMonths)) missing.push("equityCompensation.cliffMonths");
      if (!equity.vestingFrequency) missing.push("equityCompensation.vestingFrequency");
    }
  }

  return missing;
}
