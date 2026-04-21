type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${formattedArgs}`;
  }

  public info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage('info', message, ...args));
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message, ...args));
  }

  public debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export default Logger;
