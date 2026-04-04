#!/usr/bin/env node

/**
 * Test run with sample data to verify the pipeline works.
 * Simulates what collected Reddit/review data would look like.
 */

import { formatMarkdown } from './src/output/formatter.js';

// Simulated pain points (what Stage 2 would produce from real scraped data)
const painPoints = [
  {
    theme: "Generic journal prompts feel impersonal",
    severity: "critical",
    frequency: 34,
    verbatimQuotes: [
      "Every journal I've bought has the same 'what are you grateful for' prompt. I need something that actually gets me thinking.",
      "The prompts feel like they were written by someone who's never actually struggled with mental health.",
      "I want prompts that meet me where I am on bad days, not just sunshine and rainbows."
    ],
    sources: ["reddit", "web"]
  },
  {
    theme: "Can't maintain journaling consistency",
    severity: "critical",
    frequency: 28,
    verbatimQuotes: [
      "I start every journal excited and abandon it by week 3. The guilt makes my anxiety worse.",
      "I missed two days and now the whole thing feels ruined. Why can't journals be designed for people who skip days?",
      "Journaling feels like another thing on my to-do list I'm failing at."
    ],
    sources: ["reddit", "review"]
  },
  {
    theme: "Journaling triggers overwhelming emotions",
    severity: "major",
    frequency: 19,
    verbatimQuotes: [
      "Sometimes writing about my feelings opens a floodgate I can't close. I need some kind of structure to feel safe.",
      "My therapist recommended journaling but I spiral when I free-write. Guided prompts help but most are too shallow."
    ],
    sources: ["reddit", "web"]
  },
  {
    theme: "Shame around mental health struggles",
    severity: "major",
    frequency: 22,
    verbatimQuotes: [
      "I don't want a journal that screams 'MENTAL HEALTH' on the cover. I just want something that helps without broadcasting my struggles.",
      "I'd love a journal I could use at a coffee shop without feeling exposed.",
      "The overly clinical ones make me feel like a patient, not a person."
    ],
    sources: ["reddit", "review"]
  },
  {
    theme: "No guidance for beginners",
    severity: "major",
    frequency: 15,
    verbatimQuotes: [
      "I bought a 'mental health journal' and it's literally just blank pages with inspirational quotes. I don't know where to start.",
      "I need hand-holding, not a blank page. That blank page is exactly what my brain feels like."
    ],
    sources: ["review", "web"]
  }
];

// Simulated ad briefs (what Stage 3 would produce)
const adBriefs = [
  {
    painPoint: "Generic journal prompts feel impersonal",
    severity: "critical",
    frequency: 34,
    verbatimQuotes: painPoints[0].verbatimQuotes,
    hooks: [
      "What if your journal actually understood bad mental health days?",
      "Tired of 'what are you grateful for?' when you can barely get out of bed?",
      "You deserve a journal that was written by someone who gets it."
    ],
    painAgitation: "Every journal promises to transform your mental health, but the prompts feel copy-pasted from a generic self-help book. 'List 3 things you're grateful for.' 'Describe your perfect day.' When you're in the thick of anxiety or depression, those prompts don't just fall flat — they make you feel broken for not being able to answer them.",
    solutionFraming: "I'm Proud of You journals are designed with prompts that meet you exactly where you are — whether that's a good day, a hard day, or an I-can-barely-function day. No toxic positivity. Just honest, thoughtful prompts that make you feel seen, not judged.",
    ctas: [
      "See the prompts that actually get it →",
      "Start journaling on your terms — shop now",
      "Your mental health deserves better than generic. Grab yours today."
    ],
    targetAudience: {
      demographic: "Women 22-38, college-educated, dealing with anxiety/depression, interested in self-improvement",
      psychographic: "Values authenticity over perfection. Skeptical of 'wellness culture' but genuinely wants to feel better. Has tried journaling before but felt let down."
    },
    emotionalTone: {
      primary: "Validation — feeling truly seen and understood",
      secondary: "Relief — finally, something designed for real struggles"
    },
    suggestedFormat: {
      format: "UGC-style",
      rationale: "A real person flipping through the journal, reading prompts out loud, and reacting with genuine surprise — 'wait, this one actually hits different' — builds trust and shows the product in action."
    }
  },
  {
    painPoint: "Can't maintain journaling consistency",
    severity: "critical",
    frequency: 28,
    verbatimQuotes: painPoints[1].verbatimQuotes,
    hooks: [
      "What if missing a day in your journal didn't mean you failed?",
      "You abandoned your last journal by week 3. This one's different.",
      "A journal designed for people who 'can't stick with journaling.'"
    ],
    painAgitation: "You bought the journal with the best intentions. Day one felt amazing. By day five, you skipped a page. By week three, it's collecting dust — and now you feel guilty about THAT too. The journal that was supposed to help your mental health just became another source of anxiety.",
    solutionFraming: "I'm Proud of You journals are built for real life, not perfect streaks. Skip a day, skip a week — pick it back up without guilt. Every page stands alone, so there's no 'falling behind.' Because healing isn't linear, and your journal shouldn't pretend it is.",
    ctas: [
      "A journal that doesn't judge your pace → check it out",
      "Skip days without guilt — see how it works",
      "Ready for a journal that works with your life? Shop now."
    ],
    targetAudience: {
      demographic: "Women and men 20-35, have purchased journals/planners before, experience anxiety around productivity",
      psychographic: "Perfectionistic tendencies. Feels guilt easily. Wants structure but rebels against rigid systems. Has a drawer of half-used journals."
    },
    emotionalTone: {
      primary: "Permission — it's okay to be imperfect",
      secondary: "Hope — this time could actually be different"
    },
    suggestedFormat: {
      format: "carousel",
      rationale: "Slide 1: 'You abandoned your last journal by week 3.' Slide 2: 'The guilt made your anxiety worse.' Slide 3: 'What if a journal was designed for that?' Slide 4: Product reveal. The carousel format builds tension and mirrors the reader's experience before offering the solution."
    }
  },
  {
    painPoint: "Shame around mental health struggles",
    severity: "major",
    frequency: 22,
    verbatimQuotes: painPoints[3].verbatimQuotes,
    hooks: [
      "A mental health journal you'd actually use in public.",
      "No one needs to know it's a mental health journal — but you'll feel the difference.",
      "For people who want help, not a label."
    ],
    painAgitation: "You want to work on your mental health, but you don't want a journal that announces it to the world. The ones with 'ANXIETY WORKBOOK' on the cover stay hidden in your nightstand. The clinical-looking ones make you feel like a patient. You just want something beautiful, discreet, and actually helpful.",
    solutionFraming: "I'm Proud of You journals look like any beautifully designed journal on the outside — something you'd proudly set on a café table. But inside, every page is thoughtfully crafted to support your mental health journey. Because getting help should feel empowering, not exposing.",
    ctas: [
      "See the journal that helps without broadcasting →",
      "Beautiful outside, healing inside — take a look",
      "Self-care that's just for you. Shop the collection."
    ],
    targetAudience: {
      demographic: "Women 25-40, professionals, image-conscious, dealing with mental health privately",
      psychographic: "Cares about aesthetics and design. Keeps mental health struggles relatively private. Wants tools that integrate into their life seamlessly."
    },
    emotionalTone: {
      primary: "Empowerment — taking care of yourself on your own terms",
      secondary: "Safety — your struggles stay private"
    },
    suggestedFormat: {
      format: "static image + copy",
      rationale: "A gorgeous lifestyle photo of the journal in a public setting (café, desk, park) with copy that communicates 'this is your secret weapon.' The visual contrast between the beautiful exterior and the deeply personal interior is the hook."
    }
  }
];

// Build the full output
const output = {
  meta: {
    query: "mental health journal",
    brandName: "I'm Proud of You",
    brandUrl: "improudofyou.co",
    timestamp: new Date().toISOString(),
    sourcesQueried: ["reddit", "web", "reviews"],
    totalSnippetsCollected: 147,
  },
  painPoints,
  adBriefs,
};

console.log(formatMarkdown(output));
