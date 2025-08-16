import OpenAI from 'openai';
import { SellerContext, BuyerMessage, Classified, DraftReply, MEET_SPOTS_PROVO } from '@upseller/shared';
import { formatConversationForOpenAI, shouldInitiateScheduling, cleanResponseText } from '../utils/systemPrompt';

export class AIService {
  private openai: OpenAI | null = null;
  
  constructor() {
    // Initialize OpenAI client if API key is provided
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    } else {
      console.warn('OpenAI API key not found. Falling back to mock responses.');
    }
  }

  /**
   * Generate AI response using OpenAI GPT-4o Mini with system prompt
   */
  async generateResponse(
    message: BuyerMessage,
    classification: Classified,
    sellerContext: SellerContext,
    conversationHistory: BuyerMessage[]
  ): Promise<DraftReply> {
    
    try {
      // Try OpenAI first if available
      if (this.openai) {
        const aiResponse = await this.generateOpenAIResponse(message, sellerContext, conversationHistory);
        
        // Check if scheduling should be initiated
        const needsScheduling = shouldInitiateScheduling(aiResponse.text);
        if (needsScheduling) {
          aiResponse.text = cleanResponseText(aiResponse.text);
          aiResponse.action = 'schedule_proposal';
          aiResponse.proposedTimes = ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'];
        }
        
        return aiResponse;
      } else {
        // Fallback to enhanced mock response
        return this.mockAIResponse(message, classification, sellerContext);
      }
    } catch (error) {
      console.error('OpenAI API error, falling back to mock response:', error);
      return this.mockAIResponse(message, classification, sellerContext);
    }
  }

  /**
   * Generate response using OpenAI GPT-4o Mini
   */
  private async generateOpenAIResponse(
    message: BuyerMessage,
    sellerContext: SellerContext,
    conversationHistory: BuyerMessage[]
  ): Promise<DraftReply> {
    const messages = formatConversationForOpenAI(sellerContext, conversationHistory, message);
    
    // Log token usage estimate
    const estimatedTokens = this.estimateTokens(messages);
    console.log(`OpenAI API call - Messages: ${messages.length}, Estimated tokens: ${estimatedTokens}`);
    
    const completion = await this.openai!.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    });

    // Log actual token usage
    const usage = completion.usage;
    if (usage) {
      console.log(`OpenAI API response - Prompt tokens: ${usage.prompt_tokens}, Completion tokens: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    }

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    return {
      text: responseText,
      meetSpot: sellerContext.meetingLocation || MEET_SPOTS_PROVO[0],
    };
  }

  // Rough token estimation (OpenAI uses ~4 characters per token)
  private estimateTokens(messages: Array<{ role: string; content: string }>): number {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Mock AI response generation - enhanced fallback when OpenAI is unavailable
   * Uses intelligent logic based on classification and seller context
   */
  private async mockAIResponse(
    message: BuyerMessage,
    classification: Classified,
    sellerContext: SellerContext
  ): Promise<DraftReply> {
    
    switch (classification.intent) {
      case 'availability_check':
        return {
          text: 'Yes it is.',
          action: 'schedule_proposal',
          proposedTimes: ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'],
          meetSpot: sellerContext.meetingLocation || MEET_SPOTS_PROVO[0],
        };
        
      case 'offer':
        return this.handleOfferNegotiation(classification, sellerContext);
        
      case 'scam_risk':
        return {
          text: 'Thanks for your interest, but I prefer to keep transactions simple with cash payment at meetup. Let me know if you\'d like to arrange a time to meet!',
          action: 'decline',
          requireHumanClick: true,
          safetyNote: 'Potential scam detected - verification code request',
        };
        
      case 'schedule_proposal':
        return {
          text: `Great! I have availability this evening or tomorrow. Would 6:30 PM or 7:15 PM work for you? We can meet at ${sellerContext.meetingLocation || 'a convenient location'}.`,
          action: 'schedule_proposal',
          proposedTimes: ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'],
          meetSpot: sellerContext.meetingLocation || MEET_SPOTS_PROVO[0],
        };
        
      default:
        return {
          text: 'Thanks for your message! Let me know if you have any other questions or if you\'d like to schedule a time to meet.',
          requireHumanClick: true,
        };
    }
  }

  private handleOfferNegotiation(classification: Classified, sellerContext: SellerContext): DraftReply {
    const { offerPrice } = classification;
    const { targetPrice, lowestPrice, sellTimeFrame } = sellerContext;
    
    if (!offerPrice) {
      return {
        text: 'I\'m open to reasonable offers. What price did you have in mind?',
        requireHumanClick: true,
      };
    }

    // Aggressive strategy for one day sell timeframe
    if (sellTimeFrame === 'one day') {
      if (offerPrice >= lowestPrice) {
        return {
          text: 'That works for me! When would be good to meet up? [INITIATE_SCHEDULING]',
          action: 'accept',
        };
      } else {
        return {
          text: `I can't do $${offerPrice}, but I could do $${lowestPrice} for a quick sale today.`,
          action: 'counter',
          counterPrice: lowestPrice,
          meetSpot: sellerContext.meetingLocation || MEET_SPOTS_PROVO[0],
        };
      }
    }

    // Standard negotiation for other timeframes
    if (offerPrice >= targetPrice) {
      return {
        text: 'That sounds reasonable! When would be a good time to meet up? [INITIATE_SCHEDULING]',
        action: 'accept',
      };
    } else if (offerPrice >= lowestPrice) {
      // Counter offer between their offer and target price
      const counterPrice = Math.round((offerPrice + targetPrice) / 2);
      return {
        text: `I can't do $${offerPrice}, but I could do $${counterPrice}.`,
        action: 'counter',
        counterPrice,
        meetSpot: sellerContext.meetingLocation || MEET_SPOTS_PROVO[0],
      };
    } else {
      // Offer is below lowest price
      const counterPrice = sellTimeFrame === 'one month' ? targetPrice : 
                          Math.round((lowestPrice + targetPrice) / 2);
      return {
        text: `Thanks for the offer! I'm looking for something closer to $${targetPrice}. Would you be interested in meeting at $${counterPrice}?`,
        action: 'counter',
        counterPrice,
        meetSpot: sellerContext.meetingLocation || MEET_SPOTS_PROVO[0],
      };
    }
  }
}
