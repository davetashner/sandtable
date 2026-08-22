/** Minimal typing for the parts of mapshaper's programmatic API we use. */
declare module 'mapshaper' {
  interface Mapshaper {
    applyCommands(
      commands: string,
      input?: Record<string, string | Buffer | object>,
    ): Promise<Record<string, Buffer | string>>;
  }
  const mapshaper: Mapshaper;
  export default mapshaper;
}
