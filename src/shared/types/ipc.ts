import { IpcMainInvokeEvent } from 'electron';
import { IpcResponse } from '../utils/error-handling';

export type IpcHandler<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  event: IpcMainInvokeEvent,
  ...args: TArgs
) => Promise<IpcResponse<TReturn>> | IpcResponse<TReturn>;

export interface IpcHandlerRegistration {
  channel: string;
  handler: IpcHandler;
}
