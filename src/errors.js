// A tool error the client can act on: what went wrong and which parameter to fix
export class ToolError extends Error {
  constructor(reason, parameter = null) {
    super(reason);
    this.reason = reason;
    this.parameter = parameter;
  }
}

export const invalid = (parameter, reason) => new ToolError(reason, parameter);
