"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Speaker = "agent" | "patient";

type Message = {
  id: string;
  speaker: Speaker;
  text: string;
  createdAt: number;
};

type ConversationStep =
  | "askName"
  | "askAge"
  | "askIssue"
  | "askTime"
  | "completed";

type PatientProfile = {
  name?: string;
  age?: number;
  issue?: string;
  slot?: string;
};

const CLINIC_DETAILS = {
  name: "Aarogyam Care Clinic",
  doctor: "Dr. Kavya Sharma",
  specialization: "Skin, Hair aur Pain Management Specialist",
  services:
    "skin rejuvenation, hair fall treatment, pain therapy aur preventive health check-up",
  workingHours: "Somvaar se Shaniwaar, subah 9 baje se shaam 7 baje tak",
  consultationFee: "INR 700 ka consultation fee",
};

const initialMessages: Message[] = [
  {
    id: "seed-1",
    speaker: "agent",
    createdAt: Date.now(),
    text: `Namaste ji! Main ${CLINIC_DETAILS.name} se bol rahi hoon. Aap kaise hain ji? Apna poora naam bataiye ji.`,
  },
];

function createAgentMessage(text: string): Message {
  return {
    id: `agent-${crypto.randomUUID()}`,
    speaker: "agent",
    text,
    createdAt: Date.now(),
  };
}

function createPatientMessage(text: string): Message {
  return {
    id: `patient-${crypto.randomUUID()}`,
    speaker: "patient",
    text,
    createdAt: Date.now(),
  };
}

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

function extractName(input: string): string | undefined {
  const cleaned = input
    .replace(/(mera|meri|main|hamara)\s+naam\s+(hai\s+)?/i, "")
    .replace(/\bnaam\b/i, "")
    .replace(/\bhai\b/i, "")
    .replace(/\bji\b/gi, "")
    .trim();

  if (!cleaned) {
    return undefined;
  }

  const tokenCount = cleaned.split(/\s+/).length;
  if (tokenCount > 6) {
    return undefined;
  }

  return capitalizeWords(cleaned);
}

function extractAge(input: string): number | undefined {
  const match = input.match(/(\d{1,3})/);
  if (!match) {
    return undefined;
  }

  const age = Number.parseInt(match[0] ?? "", 10);
  if (Number.isNaN(age) || age < 1 || age > 120) {
    return undefined;
  }

  return age;
}

function sanitizeIssue(input: string): string {
  return input
    .replace(/(mujhe|mere|meri|main)\s+/gi, "")
    .replace(/\bproblem\b/gi, "problem")
    .trim();
}

function sanitizeSlot(input: string): string | undefined {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  const hasTimePattern =
    /\d/.test(normalized) ||
    /(subah|dopahar|shaam|raat|morning|evening|afternoon|noon|baje|pm|am)/i.test(
      normalized,
    );
  const hasDayPattern = /(aaj|kal|parso|somvaar|mangal|budh|guru|shukr|shanivaar)/i.test(
    normalized,
  );

  if (!hasTimePattern && !hasDayPattern) {
    return undefined;
  }

  return normalized;
}

function getStepPrompt(step: ConversationStep, profile: PatientProfile): string {
  switch (step) {
    case "askName":
      return "Apna poora naam bataiye ji.";
    case "askAge":
      return `${profile.name ?? "Aap"} ji, aapki umar kitni hai ji?`;
    case "askIssue":
      return "Aap kis samasya ke liye appointment lena chahte hain ji?";
    case "askTime":
      return "Aapko kaunsa din ya time appointment ke liye theek lagta hai ji?";
    case "completed":
    default:
      return "Kisi aur madad ki zarurat ho to zaroor bataye ji.";
  }
}

function getFaqResponse(content: string): string | undefined {
  const lower = content.toLowerCase();
  if (
    lower.includes("service") ||
    lower.includes("treatment") ||
    lower.includes("ilaj") ||
    lower.includes("problem")
  ) {
    return `Ji zaroor. ${CLINIC_DETAILS.name} me ${CLINIC_DETAILS.services} uplabdh hain ji.`;
  }

  if (
    lower.includes("time") ||
    lower.includes("timing") ||
    lower.includes("hours") ||
    lower.includes("kab") ||
    lower.includes("khule") ||
    lower.includes("open")
  ) {
    return `Clinic ka samay ${CLINIC_DETAILS.workingHours} hai ji. Ravivaar ko band rehta hai ji.`;
  }

  if (lower.includes("doctor") || lower.includes("dr")) {
    return `${CLINIC_DETAILS.doctor} ji hamare lead ${CLINIC_DETAILS.specialization} hain ji.`;
  }

  if (lower.includes("fee") || lower.includes("charge") || lower.includes("cost")) {
    return `Consultation fee ${CLINIC_DETAILS.consultationFee} hai ji, payment clinic me hi hoti hai ji.`;
  }

  if (lower.includes("address") || lower.includes("location") || lower.includes("kahaan")) {
    return `Clinic ka exact address aapke WhatsApp/SMS par turant share kiya jayega ji.`;
  }

  return undefined;
}

function processStep(
  input: string,
  step: ConversationStep,
  profile: PatientProfile,
): {
  messages: Message[];
  nextStep: ConversationStep;
  updatedProfile: PatientProfile;
  consumed: boolean;
} {
  const replies: Message[] = [];
  let nextStep: ConversationStep = step;
  let consumed = false;
  const updated: PatientProfile = { ...profile };

  if (step === "askName") {
    const name = extractName(input);
    if (!name) {
      replies.push(
        createAgentMessage(
          "Kripya apna poora naam spasht roop se bataye ji, main note kar leti hoon ji.",
        ),
      );
    } else {
      updated.name = name;
      consumed = true;
      nextStep = "askAge";
      replies.push(
        createAgentMessage(
          `Bahut dhanyavaad ${name} ji. Aapki umar kitni hai ji?`,
        ),
      );
    }
  } else if (step === "askAge") {
    const age = extractAge(input);
    if (!age) {
      replies.push(
        createAgentMessage(
          "Kripya apni umar sankhya me bataye ji, jaise 32 ji.",
        ),
      );
    } else {
      updated.age = age;
      consumed = true;
      nextStep = "askIssue";
      const prefix = updated.name ? `${updated.name} ji` : "Aap ji";
      replies.push(
        createAgentMessage(
          `${prefix}, kis samasya ke liye appointment lena chahte hain ji?`,
        ),
      );
    }
  } else if (step === "askIssue") {
    const trimmed = sanitizeIssue(input);
    if (!trimmed) {
      replies.push(
        createAgentMessage(
          "Kripya apni problem thoda sa detail me bataye ji, main likh rahi hoon ji.",
        ),
      );
    } else {
      updated.issue = trimmed;
      consumed = true;
      nextStep = "askTime";
      replies.push(
        createAgentMessage(
          "Theek hai ji. Appointment ke liye kaunsa din ya time aapko suit karega ji?",
        ),
      );
    }
  } else if (step === "askTime") {
    const slot = sanitizeSlot(input);
    if (!slot) {
      replies.push(
        createAgentMessage(
          "Kripya ek specific din aur time bataye ji, jaise 'Somvaar sham 5 baje' ji.",
        ),
      );
    } else {
      updated.slot = slot;
      consumed = true;
      nextStep = "completed";
      const name = updated.name ?? "Aap";
      const concern = updated.issue ?? "aapki samasya";
      replies.push(
        createAgentMessage(
          "Bilkul ji, ek pal ke liye hold kijiye, main appointment confirm karti hoon ji.",
        ),
      );
      replies.push(
        createAgentMessage(
          `${name} ji, aapka appointment ${slot} ke liye ${CLINIC_DETAILS.doctor} ji ke saath confirm kar diya gaya hai ji. ${concern} ke liye doctor tayar rahenge ji.`,
        ),
      );
      replies.push(
        createAgentMessage(
          "Aapka appointment confirm kar diya gaya hai. Clinic ka address aur timing WhatsApp/SMS me bhej diya jayega ji.",
        ),
      );
      replies.push(
        createAgentMessage(
          "Kisi bhi aur prashn ke liye nishank hokar poochiye ji.",
        ),
      );
    }
  } else {
    const newSlot = sanitizeSlot(input);
    if (newSlot) {
      updated.slot = newSlot;
      consumed = true;
      replies.push(
        createAgentMessage(
          "Bilkul ji, main aapka naya preferred time update kar rahi hoon ji.",
        ),
      );
      replies.push(
        createAgentMessage(
          `${updated.name ?? "Aap"} ji, naya appointment ${newSlot} par lock kar diya gaya hai ji.`,
        ),
      );
      replies.push(
        createAgentMessage(
          "Clinic ka address aur timing dobara WhatsApp/SMS par share kar diya jayega ji.",
        ),
      );
    } else if (/(time|slot|change|reschedule|dusra|badal)/i.test(input)) {
      nextStep = "askTime";
      replies.push(
        createAgentMessage(
          "Zaroor ji, kripya naya convenient din aur time bataye ji.",
        ),
      );
    } else {
      replies.push(
        createAgentMessage(
          "Main yahin hoon ji, agar kisi aur madad ki zarurat ho to bataye ji.",
        ),
      );
    }
  }

  return {
    messages: replies,
    nextStep,
    updatedProfile: updated,
    consumed,
  };
}

function ConversationHeader({
  details,
}: {
  details: typeof CLINIC_DETAILS;
}) {
  return (
    <header className="flex flex-col gap-1 rounded-2xl bg-emerald-500/10 p-4 text-emerald-900">
      <span className="text-sm font-medium uppercase tracking-wide text-emerald-700">
        {details.name}
      </span>
      <h1 className="text-2xl font-semibold text-emerald-900">
        AI Calling Receptionist
      </h1>
      <p className="text-sm text-emerald-700">
        Har patient se vinamr Hindi me baatcheet, appointment booking aur clinic
        ki jaankari turant.
      </p>
    </header>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.speaker === "agent";
  return (
    <div
      className={`flex ${isAgent ? "justify-start" : "justify-end"} px-2 text-sm sm:text-base`}
    >
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm transition ${
          isAgent
            ? "bg-white text-slate-800 ring-1 ring-slate-200"
            : "bg-emerald-500 text-white"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages);
  const [step, setStep] = useState<ConversationStep>("askName");
  const [profile, setProfile] = useState<PatientProfile>({});
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);

  const quickReplies = useMemo(() => {
    if (step === "completed") {
      return [
        "Clinic ki services?",
        "Consultation fees kitni hai?",
        "Doctor ka naam kya hai?",
        "Mujhe dusra time chahiye.",
      ];
    }

    return [
      "Main theek hoon ji.",
      "Mera naam Rahul Verma hai.",
      "Meri umar 32 hai.",
      "Mujhe bal girne ki problem hai.",
      "Kal dopahar 3 baje ka slot chalega?",
    ];
  }, [step]);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const patientMessage = createPatientMessage(trimmed);
    const faqResponse = getFaqResponse(trimmed);

    const { messages: stepReplies, nextStep, updatedProfile, consumed } =
      processStep(trimmed, step, profile);

    const responses: Message[] = [];
    if (faqResponse) {
      responses.push(createAgentMessage(faqResponse));
      if (!consumed) {
        responses.push(
          createAgentMessage(getStepPrompt(step, profile)),
        );
      }
    }

    responses.push(...stepReplies);

    setProfile(updatedProfile);
    setStep(nextStep);
    setMessages((prev) => [...prev, patientMessage, ...responses]);
    setInput("");
  };

  const handleReset = () => {
    setMessages(() =>
      initialMessages.map((message) => ({
        ...message,
        id: `seed-${crypto.randomUUID()}`,
        createdAt: Date.now(),
      })),
    );
    setProfile({});
    setStep("askName");
    setInput("");
  };

  return (
    <div className="min-h-screen bg-slate-100/80 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15)_0,_transparent_55%)] py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 sm:px-6">
        <ConversationHeader details={CLINIC_DETAILS} />
        <main className="grid gap-4 rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-xl shadow-emerald-500/5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex h-[520px] flex-col rounded-2xl border border-slate-200 bg-slate-50">
            <div
              ref={threadRef}
              className="flex-1 space-y-3 overflow-y-auto rounded-t-2xl bg-gradient-to-b from-white to-slate-50 p-4"
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setInput(reply)}
                    className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 sm:text-sm"
                  >
                    {reply}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Yahan apna jawab type kijiye ji..."
                  className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-base"
                />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                >
                  Send
                </button>
              </div>
            </form>
          </section>
          <aside className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">
                Call Script Notes
              </h2>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>
                  Har sentence me patient ko &quot;ji&quot; bolkar address
                  kijiye.
                </li>
                <li>Naam, umar, samasya aur preferred appointment time note kijiye.</li>
                <li>
                  Appointment confirm karne ke baad WhatsApp/SMS ka zikr zaroor
                  kijiye.
                </li>
                <li>Patient ke prashno ka sankshipt aur professional uttar dijiye.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <h3 className="font-semibold text-emerald-900">
                Patient Snapshot
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-emerald-700">Naam</dt>
                  <dd className="font-medium text-emerald-900">
                    {profile.name ? `${profile.name} ji` : "Pending ji"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-emerald-700">Umar</dt>
                  <dd className="font-medium text-emerald-900">
                    {profile.age ? `${profile.age} varsh ji` : "Pending ji"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-emerald-700">Samasya</dt>
                  <dd className="max-w-[180px] text-right font-medium text-emerald-900">
                    {profile.issue ? `${profile.issue} ji` : "Pending ji"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-emerald-700">Appointment Time</dt>
                  <dd className="max-w-[180px] text-right font-medium text-emerald-900">
                    {profile.slot ? `${profile.slot} ji` : "Pending ji"}
                  </dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Nayi call shuru kijiye ji
            </button>
          </aside>
        </main>
      </div>
    </div>
  );
}
