import React, { useState, useRef, useEffect } from "react";
import { OnboardingStep, OnboardingProfile, ChatApi } from "../../hooks/useChat";
import { Btn } from "../ui";

const ONBOARDING_STEPS: { step: OnboardingStep; question: string; placeholder: string; options?: string[] }[] = [
  {
    step: "welcome",
    question: "Hi! I'm TREEtiti — your AI marketing operating system. I'll help you build campaigns, create content, research markets, and grow your brand. Let's get you set up in about 60 seconds.",
    placeholder: "Ready to start",
    options: ["Let's go"],
  },
  {
    step: "goals",
    question: "What are your main goals? (comma-separated, e.g. \"grow Instagram, launch product, build email list\")",
    placeholder: "e.g. grow Instagram, launch product, build email list",
  },
  {
    step: "industry",
    question: "What industry are you in?",
    placeholder: "e.g. luxury real estate, SaaS, e-commerce, fitness",
  },
  {
    step: "content_types",
    question: "What content do you create most? (comma-separated, e.g. \"LinkedIn posts, Instagram Reels, blog articles, email newsletters\")",
    placeholder: "e.g. LinkedIn posts, Instagram Reels, blog articles, email newsletters",
  },
  {
    step: "platforms",
    question: "Which platforms matter most? (comma-separated, e.g. \"LinkedIn, Instagram, TikTok, X/Twitter, YouTube\")",
    placeholder: "e.g. LinkedIn, Instagram, TikTok, X/Twitter, YouTube",
  },
  {
    step: "research_depth",
    question: "How deep should my research be?",
    placeholder: "Choose one",
    options: ["Quick (surface-level trends)", "Deep (competitor + market analysis)", "Comprehensive (full reports with sources)"],
  },
  {
    step: "brand_voice",
    question: "How should I sound? (e.g. \"professional but warm, witty and sharp, minimal and premium, friendly and helpful\")",
    placeholder: "e.g. professional but warm, witty and sharp, minimal and premium",
  },
];

export function OnboardingConversation({
  chat,
}: {
  chat: Pick<ChatApi, "send"> & { onboardingStep: OnboardingStep; onboardingProfile: OnboardingProfile; handleOnboardingAnswer: (answer: string) => void };
}) {
  const [input, setInput] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stepConfig = ONBOARDING_STEPS.find((s) => s.step === chat.onboardingStep) ?? ONBOARDING_STEPS[0];
  const progress = ONBOARDING_STEPS.findIndex((s) => s.step === chat.onboardingStep) + 1;

  useEffect(() => {
    inputRef.current?.focus();
    setShowOptions(!!stepConfig.options);
  }, [chat.onboardingStep]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = input.trim();
    if (!answer && !stepConfig.options) return;
    chat.handleOnboardingAnswer(answer || (stepConfig.options?.[0] ?? ""));
    setInput("");
  };

  const handleOptionClick = (option: string) => {
    chat.handleOnboardingAnswer(option);
  };

  const isFirstStep = chat.onboardingStep === "welcome";
  const isLastStep = chat.onboardingStep === "brand_voice";

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Progress header */}
      <header className="flex items-center justify-center gap-3 border-b border-border bg-bg-primary px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-text-muted">Setup</span>
          <div className="hidden sm:flex items-center gap-1 h-1.5">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-6 h-1.5 rounded transition-colors ${
                  i < progress ? "bg-accent" : "bg-border"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-text-muted">{progress}/{ONBOARDING_STEPS.length}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="space-y-5">
            {/* Assistant message */}
            <div className="t-msg t-msg-assistant">
              <div className="t-msg-avatar" aria-hidden>▲</div>
              <div className="t-msg-bubble">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{stepConfig.question}</p>
                {stepConfig.options && !isFirstStep && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stepConfig.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOptionClick(opt)}
                        className="t-chip"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User input area */}
            <form onSubmit={handleSubmit} className="t-msg t-msg-user">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isFirstStep ? "Press Enter to begin" : stepConfig.placeholder}
                    className="w-full px-4 py-3 text-sm bg-bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-text-primary"
                    disabled={isFirstStep}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>
                {(!isFirstStep || stepConfig.options) && (
                  <button
                    type="submit"
                    disabled={!input.trim() && !stepConfig.options}
                    className="t-btn-primary p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next"
                  >
                    {isLastStep ? "Finish" : "Next"}
                  </button>
                )}
              </div>
            </form>

            {/* Profile preview on last step */}
            {isLastStep && (
              <div className="t-card p-4 border border-accent/20 bg-accent/[0.06]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Your Profile Preview</div>
                <div className="space-y-1 text-sm text-text-primary">
                  <p><span className="font-medium">Goals:</span> {chat.onboardingProfile.goals.join(", ") || "—"}</p>
                  <p><span className="font-medium">Industry:</span> {chat.onboardingProfile.industry || "—"}</p>
                  <p><span className="font-medium">Content:</span> {chat.onboardingProfile.contentTypes.join(", ") || "—"}</p>
                  <p><span className="font-medium">Platforms:</span> {chat.onboardingProfile.platforms.join(", ") || "—"}</p>
                  <p><span className="font-medium">Research:</span> {chat.onboardingProfile.researchDepth}</p>
                  <p><span className="font-medium">Brand voice:</span> {chat.onboardingProfile.brandVoice || "—"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}