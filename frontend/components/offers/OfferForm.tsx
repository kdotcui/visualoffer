"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_OFFER_VALUES,
  OfferDataSchema,
  getMissingFields,
  type OfferData,
  type OfferDataInput,
  type OfferFieldPath,
  type PartialOfferData,
} from "@/lib/schemas/offer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MissingFieldsSummary } from "@/components/offers/MissingFieldsSummary";

type OfferFormProps = {
  initialData?: OfferDataInput;
  parserMissingFields?: OfferFieldPath[];
  submitLabel?: string;
  onSubmit: (data: OfferData) => void;
};

function numberInputProps() {
  return {
    type: "number",
    min: 0,
    step: "any",
    inputMode: "decimal" as const,
  };
}

export function OfferForm({
  initialData = DEFAULT_OFFER_VALUES,
  parserMissingFields = [],
  submitLabel = "Save offer",
  onSubmit,
}: OfferFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<OfferDataInput, unknown, OfferData>({
    resolver: zodResolver(OfferDataSchema),
    defaultValues: initialData,
  });
  const watchedValues = useWatch({ control });

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  const currentMissing = getMissingFields(watchedValues as PartialOfferData);
  const missingFields = Array.from(new Set([...parserMissingFields, ...currentMissing]));

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
      <MissingFieldsSummary fields={missingFields} />

      <Card>
        <CardHeader>
          <CardTitle>Role details</CardTitle>
          <CardDescription>These fields identify the offer for comparison later.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="companyName">Company name</FieldLabel>
            <Input id="companyName" placeholder="Acme" {...register("companyName")} />
            <FieldError>{errors.companyName?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="jobTitle">Job title</FieldLabel>
            <Input id="jobTitle" placeholder="Senior Software Engineer" {...register("jobTitle")} />
            <FieldError>{errors.jobTitle?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="level">Level</FieldLabel>
            <Input id="level" placeholder="L5, Staff, E4" {...register("level")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employment.type">Employment type</FieldLabel>
            <Controller
              control={control}
              name="employment.type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="employment.type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full time</SelectItem>
                    <SelectItem value="part_time">Part time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.employment?.type?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="employment.offerDate">Offer date</FieldLabel>
            <Input id="employment.offerDate" type="date" {...register("employment.offerDate")} />
            <FieldError>{errors.employment?.offerDate?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="employment.startDate">Start date</FieldLabel>
            <Input id="employment.startDate" type="date" {...register("employment.startDate")} />
            <FieldError>{errors.employment?.startDate?.message}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Defaults assume US offers and unknown work mode when absent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="location.city">City</FieldLabel>
            <Input id="location.city" placeholder="Menlo Park" {...register("location.city")} />
            <FieldError>{errors.location?.city?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="location.state">State</FieldLabel>
            <Input id="location.state" placeholder="CA" {...register("location.state")} />
            <FieldError>{errors.location?.state?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="location.country">Country</FieldLabel>
            <Input id="location.country" readOnly {...register("location.country")} />
            <FieldDescription>US only for the MVP.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="location.workMode">Work mode</FieldLabel>
            <Controller
              control={control}
              name="location.workMode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="location.workMode">
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.location?.workMode?.message}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash compensation</CardTitle>
          <CardDescription>Amounts are stored as raw USD numbers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cashCompensation.currency">Currency</FieldLabel>
            <Input id="cashCompensation.currency" readOnly {...register("cashCompensation.currency")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="cashCompensation.baseSalary">Base salary</FieldLabel>
            <Input
              id="cashCompensation.baseSalary"
              placeholder="180000"
              {...numberInputProps()}
              {...register("cashCompensation.baseSalary")}
            />
            <FieldError>{errors.cashCompensation?.baseSalary?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="cashCompensation.targetAnnualBonusPercentage">Target annual bonus %</FieldLabel>
            <Input
              id="cashCompensation.targetAnnualBonusPercentage"
              placeholder="15"
              {...numberInputProps()}
              {...register("cashCompensation.targetAnnualBonusPercentage")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cashCompensation.signOnBonus">Sign-on bonus</FieldLabel>
            <Input
              id="cashCompensation.signOnBonus"
              placeholder="25000"
              {...numberInputProps()}
              {...register("cashCompensation.signOnBonus")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cashCompensation.additionalBonus">Additional bonus</FieldLabel>
            <Input
              id="cashCompensation.additionalBonus"
              placeholder="10000"
              {...numberInputProps()}
              {...register("cashCompensation.additionalBonus")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cashCompensation.signOnPayoutTerms">Sign-on payout terms</FieldLabel>
            <Input
              id="cashCompensation.signOnPayoutTerms"
              placeholder="50% year 1 / 50% year 2"
              {...register("cashCompensation.signOnPayoutTerms")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equity compensation</CardTitle>
          <CardDescription>Leave blank for cash-only offers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="equityCompensation.equityType">Equity type</FieldLabel>
            <Controller
              control={control}
              name="equityCompensation.equityType"
              render={({ field }) => (
                <Select value={field.value ?? "none"} onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}>
                  <SelectTrigger id="equityCompensation.equityType">
                    <SelectValue placeholder="Select equity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="rsu">RSU</SelectItem>
                    <SelectItem value="stock_options">Stock options</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.equityCompensation?.equityType?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="equityCompensation.totalGrantValue">Total grant value</FieldLabel>
            <Input
              id="equityCompensation.totalGrantValue"
              placeholder="200000"
              {...numberInputProps()}
              {...register("equityCompensation.totalGrantValue")}
            />
            <FieldError>{errors.equityCompensation?.totalGrantValue?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="equityCompensation.totalShares">Total shares</FieldLabel>
            <Input
              id="equityCompensation.totalShares"
              placeholder="500"
              {...numberInputProps()}
              {...register("equityCompensation.totalShares")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="equityCompensation.vestingScheduleYears">Vesting years</FieldLabel>
            <Input
              id="equityCompensation.vestingScheduleYears"
              placeholder="4"
              {...numberInputProps()}
              {...register("equityCompensation.vestingScheduleYears")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="equityCompensation.cliffMonths">Cliff months</FieldLabel>
            <Input
              id="equityCompensation.cliffMonths"
              placeholder="12"
              {...numberInputProps()}
              {...register("equityCompensation.cliffMonths")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="equityCompensation.vestingFrequency">Vesting frequency</FieldLabel>
            <Controller
              control={control}
              name="equityCompensation.vestingFrequency"
              render={({ field }) => (
                <Select value={field.value ?? "none"} onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}>
                  <SelectTrigger id="equityCompensation.vestingFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annually">Semi-annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="equityCompensation.vestingStartDate">Vesting start date</FieldLabel>
            <Input id="equityCompensation.vestingStartDate" type="date" {...register("equityCompensation.vestingStartDate")} />
            <FieldError>{errors.equityCompensation?.vestingStartDate?.message}</FieldError>
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="equityCompensation.notes">Equity notes</FieldLabel>
            <Textarea id="equityCompensation.notes" placeholder="Refreshers, exercise terms, or unusual vesting terms" {...register("equityCompensation.notes")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benefits and notes</CardTitle>
          <CardDescription>Optional fields for comparison context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="benefits.match401k">401k match</FieldLabel>
            <Input id="benefits.match401k" placeholder="50% up to 6%" {...register("benefits.match401k")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="benefits.healthInsurance">Health insurance</FieldLabel>
            <Input id="benefits.healthInsurance" placeholder="Premium covered, HSA, etc." {...register("benefits.healthInsurance")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="benefits.relocation">Relocation</FieldLabel>
            <Input id="benefits.relocation" placeholder="$10k relocation stipend" {...register("benefits.relocation")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="benefits.paidTimeOff">Paid time off</FieldLabel>
            <Input id="benefits.paidTimeOff" placeholder="Unlimited, 20 days, etc." {...register("benefits.paidTimeOff")} />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="notes">Offer notes</FieldLabel>
            <Textarea id="notes" placeholder="Anything else you want to remember about this offer" {...register("notes")} />
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
