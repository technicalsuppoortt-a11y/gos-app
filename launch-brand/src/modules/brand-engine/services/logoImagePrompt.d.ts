export type LogoImagePromptBrief = {
  name: string;
  niche?: string;
  subNiche?: string;
  businessDescription?: string;
  audience?: string;
  desiredOutcome?: string;
  voices?: string[];
  keywords?: string[];
  theme?: {
    light?: { primary?: string; secondary?: string };
    typography?: { heading?: string; arabic?: string };
  };
};

export const logoImagePromptVersion: 'native-logo-image-v1';

export function buildLogoImagePrompt(input: {
  brief: LogoImagePromptBrief;
  answers?: { preference?: string; detail?: string };
  previousSuggestions?: { rationale?: string; logo?: { concept?: string } }[];
  reviewFeedback?: string;
}): string;
