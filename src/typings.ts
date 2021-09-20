import {
  BaseCommandInteraction,
  ContextMenuInteraction,
  Message,
  MessageComponentInteraction,
  PartialMessage,
} from 'discord.js';
import { APIMessage } from 'discord-api-types';
  
export type LaxMessage = Message | PartialMessage;
export type InteractionMessage = Message | APIMessage;

export type ReplyableInteraction
  = BaseCommandInteraction | MessageComponentInteraction;
export type MessageTriggeredInteraction
  = ContextMenuInteraction | MessageComponentInteraction;
