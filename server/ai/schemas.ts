import { Type } from '@google/genai';

export const BudgetAdvisorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    tradeOffExplanation: {
      type: Type.STRING,
      description: 'Concise explanation of the trade-offs and rationale for budget adjustments.',
    },
    alternativeSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of practical cost-saving or high-value vendor swaps.',
    },
  },
  required: ['tradeOffExplanation', 'alternativeSuggestions'],
};

export const IdeasResponseSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          estimatedCostMin: { type: Type.INTEGER },
          estimatedCostMax: { type: Type.INTEGER },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['category', 'title', 'description', 'estimatedCostMin', 'estimatedCostMax', 'tags'],
      },
    },
  },
  required: ['ideas'],
};

export const VendorQuestionsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of essential vetting questions for the vendor category.',
    },
  },
  required: ['questions'],
};

export const RiskMitigationsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    mitigations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ruleId: { type: Type.STRING },
          mitigationSuggestion: { type: Type.STRING },
        },
        required: ['ruleId', 'mitigationSuggestion'],
      },
    },
  },
  required: ['mitigations'],
};
