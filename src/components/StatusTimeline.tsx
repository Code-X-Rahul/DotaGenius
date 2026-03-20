"use client";

type StageStatus = "pending" | "active" | "complete" | "failed";

interface TimelineStep {
  label: string;
  stageKey: string;
}

const STEPS: TimelineStep[] = [
  { label: "Submitted", stageKey: "submitted" },
  { label: "Downloading Replay", stageKey: "downloading" },
  { label: "Parsing Replay", stageKey: "parsing" },
  { label: "Complete", stageKey: "complete" },
];

function getStepStatus(
  stepKey: string,
  currentStage: string,
  isFailed: boolean
): StageStatus {
  const stageOrder = ["submitted", "downloading", "parsing", "complete"];
  const currentIndex = stageOrder.indexOf(currentStage);
  const stepIndex = stageOrder.indexOf(stepKey);

  if (isFailed && stepIndex === currentIndex) return "failed";
  if (isFailed && stepIndex > currentIndex) return "pending";
  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function StepIndicator({ status }: { status: StageStatus }) {
  const baseClasses =
    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors";

  switch (status) {
    case "complete":
      return (
        <div className={`${baseClasses} bg-[var(--success)] text-white`}>
          <CheckIcon />
        </div>
      );
    case "active":
      return (
        <div className={`${baseClasses} bg-[var(--accent)] text-white`}>
          <Spinner />
        </div>
      );
    case "failed":
      return (
        <div className={`${baseClasses} bg-[var(--error)] text-white`}>
          <XIcon />
        </div>
      );
    default:
      return (
        <div
          className={`${baseClasses} bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-[var(--muted)]`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
        </div>
      );
  }
}

interface StatusTimelineProps {
  stage: string;
  percent: number;
  error?: string | null;
}

export default function StatusTimeline({
  stage,
  percent,
  error,
}: StatusTimelineProps) {
  const isFailed = stage === "failed";
  // For display, if failed, figure out which stage it failed at
  const displayStage = isFailed ? "downloading" : stage;

  return (
    <div className="w-full max-w-md">
      <div className="space-y-0">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.stageKey, displayStage, isFailed);
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.stageKey} className="flex gap-4">
              {/* Left column: indicator + connector line */}
              <div className="flex flex-col items-center">
                <StepIndicator status={status} />
                {!isLast && (
                  <div
                    className={`w-0.5 h-8 transition-colors ${
                      status === "complete"
                        ? "bg-[var(--success)]"
                        : "bg-[var(--card-border)]"
                    }`}
                  />
                )}
              </div>

              {/* Right column: label */}
              <div className="pt-2 pb-4">
                <span
                  className={`text-sm font-medium ${
                    status === "active"
                      ? "text-[var(--accent)]"
                      : status === "complete"
                        ? "text-[var(--success)]"
                        : status === "failed"
                          ? "text-[var(--error)]"
                          : "text-[var(--muted)]"
                  }`}
                >
                  {step.label}
                </span>
                {status === "active" && percent > 0 && percent < 100 && (
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {percent}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
