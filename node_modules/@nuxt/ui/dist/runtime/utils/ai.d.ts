import type { UIMessage } from 'ai';
/**
 * Extracts and concatenates all text parts from a UIMessage.
 *
 * @warning Do not use the output directly with MDC or v-html for user messages,
 * as this can lead to XSS vulnerabilities. For rendering, iterate over message.parts
 * and only render assistant messages with MDC.
 */
export declare function getTextFromMessage(message: UIMessage): string;
/**
 * Checks if a text or reasoning part is currently being streamed.
 */
export declare function isPartStreaming(part: {
    state?: string;
}): boolean;
/**
 * Checks if a tool part is still streaming (hasn't reached a terminal state
 * and isn't paused waiting for a user approval).
 *
 * Terminal states are `output-available`, `output-error`, and `output-denied`,
 * `approval-requested` is a paused state.
 */
export declare function isToolStreaming(part: {
    state: string;
}): boolean;
/**
 * Checks if a tool part is waiting for a user approval response.
 */
export declare function isToolApprovalPending(part: {
    state: string;
}): boolean;
/**
 * Checks if a reasoning part is currently being streamed.
 *
 * @deprecated Use `isPartStreaming` instead.
 */
export declare function isReasoningStreaming(message: UIMessage, partIndex: number, chat: {
    status: string;
    messages: UIMessage[];
}): boolean;
