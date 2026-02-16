# PRD.md — PawLogix Product Requirements

## Product Vision
PawLogix empowers pet owners to understand their pet's health by transforming confusing vet records into clear, actionable insights — so they can be better advocates for their pet's care.

## Problem Statement
Pet owners receive vet records and lab results they cannot fully interpret. Medical terminology, abbreviations, and reference ranges are written for veterinary professionals, not pet parents. This leads to:
- Confusion and anxiety after vet visits
- Inability to spot trends or changes across multiple records
- Scattered paper records with no central organization
- Feeling disempowered when discussing their pet's health with vets

## Target User
**Primary Persona: "Concerned Caroline"**
- Age: 28-42
- Tech-savvy millennial/Gen-Z pet owner
- Treats pets as family members ("pet parent")
- Spends $1,000-3,000/year on pet care
- Takes pets to vet 2-4x/year
- Has 1-3 pets (dogs and/or cats)
- Keeps some paper records but often loses them
- Googles symptoms and gets overwhelmed by conflicting info
- Would pay for peace of mind regarding pet health

## ONE Killer Feature (MVP)
**AI Record Interpreter**: Scan or photograph any vet document → AI translates it into plain English with flagged concerns and suggested vet questions.

## In Scope (Beta v1.0)
- Anonymous-first experience (no login required to use app)
- Optional email/password account creation (from Settings, for data backup)
- Supabase anonymous auth → optional account linking
- Pet profile management (dogs and cats, multiple pets)
- Record scanning via camera or photo library
- AI interpretation of scanned records (via Claude API vision)
- Record detail view with interpreted sections
- AI chat for follow-up questions about interpreted records
- Basic health trend charts (weight, key lab values over time)
- Medication and vaccine reminders via local notifications
- Data export (JSON)
- Account deletion
- Usage tracking infrastructure (NOT enforced)

## Explicitly OUT of Scope (Beta)
- Payment / subscription / paywalls (free beta)
- Social features (sharing with other users)
- Direct vet communication or telemedicine
- Wearable device integration
- Pet marketplace or product recommendations
- Dog/cat breed identification from photos
- Symptom checker (NOT interpreting records — we only interpret documents the user uploads)
- Web app (mobile only)
- Android-specific optimizations (iOS-first for beta)
- Dark mode (stretch goal only)
- Multi-language support
- PDF document upload (images only for MVP)

## Success Criteria (Beta)
- 50+ beta testers onboarded via TestFlight
- Average 3+ records scanned per active user
- AI interpretation accuracy rated 4+/5 by testers
- < 30 second interpretation time
- < 5% interpretation failure rate
- At least 20% of users engage with AI chat follow-up
- NPS score > 40 from beta testers

## Disclaimers (MANDATORY)
- Every screen showing AI health content MUST display: "AI interpretation — always consult your veterinarian for medical decisions"
- The app does NOT diagnose conditions
- The app does NOT prescribe treatments
- The app does NOT replace veterinary care
- AI interpretations are informational and educational only

## Competitive Landscape
| Competitor | Strength | Weakness | PawLogix Advantage |
|-----------|----------|----------|-------------------|
| VetVault | Full-featured, AI lab interpreter | Feature-bloated, overwhelming UI | Simpler, focused on ONE killer feature |
| VitusVet | Vet practice integration | Requires vet to partner, limited AI | Works with ANY vet record, no vet signup needed |
| Pet Parents | Simple record storage | No AI interpretation, manual entry | AI does the interpretation work |
| MyPet | Export to Excel, basic tracking | No AI, ugly UI, no OCR | Modern design, AI-powered insights |
| TTcare | AI image analysis (eyes, skin) | Physical symptom focus, not records | Document interpretation focus (complementary, not competitive) |

## Key Differentiator
PawLogix is the ONLY app focused specifically on **interpreting existing vet documents** for pet owners. Competitors either require vet practice integration (VitusVet), focus on manual data entry (MyPet, Pet Parents), or analyze physical symptoms (TTcare). PawLogix meets owners where they are: confused, holding a piece of paper from the vet, wanting to understand what it means.
